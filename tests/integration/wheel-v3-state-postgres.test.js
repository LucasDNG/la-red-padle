import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test,{beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const connectionString=process.env.TEST_DATABASE_URL;
if(!connectionString)throw new Error('TEST_DATABASE_URL es obligatorio para los tests PostgreSQL');
const {Pool}=pg;
const pool=new Pool({connectionString});
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const schema=fs.readFileSync(path.resolve(__dirname,'../../database/schema.sql'),'utf8');
const patch=fs.readFileSync(path.resolve(__dirname,'../../database/PATCH_WHEEL_V3_STATE_2026-09-28.sql'),'utf8');

async function resetDb(){await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');await pool.query(schema);}
beforeEach(resetDb);
after(async()=>pool.end());

async function maleLeague(){return (await pool.query("SELECT id FROM leagues WHERE slug='masculino'")).rows[0];}
async function category(number,slug='masculino'){return (await pool.query('SELECT c.* FROM categories c JOIN leagues l ON l.id=c.league_id WHERE l.slug=$1 AND c.number=$2',[slug,number])).rows[0];}
async function seedPair(position=1,categoryNumber=3){const l=await maleLeague();const c=await category(categoryNumber);return (await pool.query('INSERT INTO pairs(league_id,category_id,position) VALUES($1,$2,$3) RETURNING *',[l.id,c.id,position])).rows[0];}

test('clean schema stays on wheel-v2 while exposing Wheel v3 preparation state',async()=>{
  const engine=(await pool.query("SELECT value#>>'{}' value FROM app_settings WHERE key='engine'")).rows[0].value;
  assert.equal(engine,'wheel-v2');
  for(const name of ['league_wheel_state','pair_wheel_state','pair_duo_state','first_place_reigns']){
    assert.equal((await pool.query('SELECT to_regclass($1) name',[`public.${name}`])).rows[0].name,name);
  }
  assert.equal(Number((await pool.query('SELECT count(*) n FROM league_wheel_state')).rows[0].n),2);
});

test('Wheel v3 preparation patch is idempotent',async()=>{
  await pool.query(patch);await pool.query(patch);
  assert.equal(Number((await pool.query('SELECT count(*) n FROM league_wheel_state')).rows[0].n),2);
  const cols=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='wheel_assignments' AND column_name IN ('attacker_pair_id','defender_pair_id','cancelled_at','first_result_at')")).rows.map(r=>r.column_name).sort();
  assert.deepEqual(cols,['attacker_pair_id','cancelled_at','defender_pair_id','first_result_at']);
});

test('duo state is canonical and unique',async()=>{
  const l=await maleLeague();const c=await category(4);
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('A','A','30000001','1','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('B','B','30000002','2','x','male') RETURNING id")).rows[0];
  await pool.query('INSERT INTO pair_duo_state(league_id,member_low_id,member_high_id,pending_relegation_category_id,pending_relegation_started_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[l.id,u1.id,u2.id,c.id]);
  await assert.rejects(pool.query('INSERT INTO pair_duo_state(league_id,member_low_id,member_high_id) VALUES($1,$2,$3)',[l.id,u1.id,u2.id]));
  await assert.rejects(pool.query('INSERT INTO pair_duo_state(league_id,member_low_id,member_high_id) VALUES($1,$2,$3)',[l.id,u2.id,u1.id]));
});

test('assignment roles must identify the two assignment participants',async()=>{
  const l=await maleLeague();const c=await category(3);const a=await seedPair(1,3);const b=await seedPair(2,3);const outsider=await seedPair(3,3);
  const valid=(await pool.query('INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id',[l.id,c.id,a.id,b.id])).rows[0];
  assert.ok(valid.id);
  await assert.rejects(pool.query('INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$5,$3)',[l.id,c.id,a.id,b.id,outsider.id]));
});

test('PostgreSQL transaction clock authors assignment and 30-day deadline',async()=>{
  const l=await maleLeague();const c=await category(5);const a=await seedPair(1,5);const b=await seedPair(2,5);const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const serverNow=(await client.query('SELECT CURRENT_TIMESTAMP now')).rows[0].now;
    const row=(await client.query('INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id) VALUES($1,$2,$3,$4) RETURNING assigned_at,deadline_at',[l.id,c.id,a.id,b.id])).rows[0];
    const seconds=Number((await client.query('SELECT EXTRACT(EPOCH FROM ($1::timestamptz-$2::timestamptz)) seconds',[row.deadline_at,row.assigned_at])).rows[0].seconds);
    assert.equal(new Date(row.assigned_at).getTime(),new Date(serverNow).getTime());
    assert.equal(seconds,30*24*60*60);
    await client.query('ROLLBACK');
  }finally{client.release();}
});

test('only one first-place reign can remain open per circuit',async()=>{
  const l=await maleLeague();const a=await seedPair(1,1);const b=await seedPair(2,1);
  await pool.query('INSERT INTO first_place_reigns(league_id,pair_id) VALUES($1,$2)',[l.id,a.id]);
  await assert.rejects(pool.query('INSERT INTO first_place_reigns(league_id,pair_id) VALUES($1,$2)',[l.id,b.id]));
  await pool.query('UPDATE first_place_reigns SET ended_at=CURRENT_TIMESTAMP WHERE league_id=$1 AND ended_at IS NULL',[l.id]);
  const second=(await pool.query('INSERT INTO first_place_reigns(league_id,pair_id) VALUES($1,$2) RETURNING id',[l.id,b.id])).rows[0];assert.ok(second.id);
});

test('sanction auto-reactivation uses an exact 30-day DB deadline',async()=>{
  const p=await seedPair(1,6);
  await pool.query("INSERT INTO pair_wheel_state(pair_id,inactive_since,return_position_base,inactive_reason,auto_reactivate_at) VALUES($1,CURRENT_TIMESTAMP,1,'three_failures',CURRENT_TIMESTAMP+interval '30 days')",[p.id]);
  const row=(await pool.query('SELECT EXTRACT(EPOCH FROM (auto_reactivate_at-inactive_since)) seconds FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0];
  assert.equal(Number(row.seconds),30*24*60*60);
});


test('new wheel-v2 pairs keep Wheel v3 preparation state synchronized automatically',async()=>{
  const l=await maleLeague();const c=await category(2);
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('C','C','30000003','3','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('D','D','30000004','4','x','male') RETURNING id")).rows[0];
  const p=(await pool.query('INSERT INTO pairs(league_id,category_id,position) VALUES($1,$2,1) RETURNING id',[l.id,c.id])).rows[0];
  assert.equal(Number((await pool.query('SELECT count(*) n FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0].n),1);
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[p.id,u1.id,u2.id]);
  const duo=(await pool.query('SELECT * FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[l.id,u1.id,u2.id])).rows[0];
  assert.ok(duo);
  assert.equal(Number(duo.failure_streak),0);
});


test('pre-v3 wheel-v2 schema migrates forward without changing engine or sporting data',async()=>{
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await pool.query(`
    CREATE TABLE app_settings(
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO app_settings(key,value) VALUES('engine','"wheel-v2"'::jsonb);

    CREATE TABLE users(
      id bigserial PRIMARY KEY,
      first_name text NOT NULL,
      last_name text NOT NULL,
      dni text NOT NULL UNIQUE,
      phone text NOT NULL,
      password_hash text NOT NULL,
      gender text NOT NULL
    );

    CREATE TABLE leagues(
      id bigserial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      gender text NOT NULL,
      active boolean NOT NULL DEFAULT true
    );
    INSERT INTO leagues(slug,name,gender) VALUES('masculino','Masculino','male');

    CREATE TABLE categories(
      id bigserial PRIMARY KEY,
      league_id bigint NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
      number int NOT NULL,
      name text NOT NULL,
      UNIQUE(league_id,number),
      UNIQUE(id,league_id)
    );
    INSERT INTO categories(league_id,number,name)
    SELECT id,3,'3ª' FROM leagues WHERE slug='masculino';

    CREATE TABLE pairs(
      id bigserial PRIMARY KEY,
      league_id bigint NOT NULL REFERENCES leagues(id),
      category_id bigint NOT NULL REFERENCES categories(id),
      position int NOT NULL,
      competition_state text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE pair_members(
      pair_id bigint NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
      user_id bigint NOT NULL REFERENCES users(id),
      PRIMARY KEY(pair_id,user_id)
    );

    CREATE TABLE pair_pause_requests(
      id bigserial PRIMARY KEY,
      pair_id bigint NOT NULL REFERENCES pairs(id),
      requested_by_user_id bigint NOT NULL REFERENCES users(id),
      status text NOT NULL DEFAULT 'pending',
      effective_after_current boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    );

    CREATE TABLE wheel_assignments(
      id bigserial PRIMARY KEY,
      league_id bigint NOT NULL REFERENCES leagues(id),
      category_id bigint NOT NULL REFERENCES categories(id),
      pair_a_id bigint NOT NULL REFERENCES pairs(id),
      pair_b_id bigint NOT NULL REFERENCES pairs(id),
      status text NOT NULL DEFAULT 'open',
      assigned_at timestamptz NOT NULL DEFAULT now(),
      deadline_at timestamptz NOT NULL DEFAULT (now()+interval '30 days'),
      confirmation_deadline_at timestamptz
    );
  `);

  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('Legacy','Uno','40000001','1','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('Legacy','Dos','40000002','2','x','male') RETURNING id")).rows[0];
  const lc=(await pool.query("SELECT l.id league_id,c.id category_id FROM leagues l JOIN categories c ON c.league_id=l.id WHERE l.slug='masculino'")).rows[0];
  const p=(await pool.query("INSERT INTO pairs(league_id,category_id,position,competition_state) VALUES($1,$2,4,'paused') RETURNING id",[lc.league_id,lc.category_id])).rows[0];
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[p.id,u1.id,u2.id]);
  await pool.query("INSERT INTO pair_pause_requests(pair_id,requested_by_user_id,status,resolved_at) VALUES($1,$2,'confirmed',CURRENT_TIMESTAMP-interval '10 days')",[p.id,u1.id]);

  await pool.query(patch);
  await pool.query(patch);

  const engine=(await pool.query("SELECT value#>>'{}' value FROM app_settings WHERE key='engine'")).rows[0].value;
  assert.equal(engine,'wheel-v2');

  const migrated=(await pool.query('SELECT * FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0];
  assert.equal(Number(migrated.return_position_base),4);
  assert.equal(migrated.inactive_reason,'voluntary');
  assert.ok(migrated.inactive_since);

  const duo=(await pool.query('SELECT * FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[lc.league_id,u1.id,u2.id])).rows[0];
  assert.ok(duo);
  assert.equal(Number(duo.failure_streak),0);

  const sporting=(await pool.query('SELECT category_id,position,competition_state FROM pairs WHERE id=$1',[p.id])).rows[0];
  assert.equal(Number(sporting.category_id),Number(lc.category_id));
  assert.equal(Number(sporting.position),4);
  assert.equal(sporting.competition_state,'paused');
});
