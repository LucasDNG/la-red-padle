import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test,{beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const connectionString=process.env.TEST_DATABASE_URL;
if(!connectionString)throw new Error('TEST_DATABASE_URL es obligatorio para los tests PostgreSQL');
process.env.DATABASE_URL=connectionString;
const {Pool}=pg;
const pool=new Pool({connectionString});
const {planWheelV3Category,wheelV3FormationSnapshot}=await import('../../src/wheelV3Engine.js');
const {pool:appPool}=await import('../../src/db.js');
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const schema=fs.readFileSync(path.resolve(__dirname,'../../database/schema.sql'),'utf8');
const patch=fs.readFileSync(path.resolve(__dirname,'../../database/PATCH_WHEEL_V3_STATE_2026-09-28.sql'),'utf8');

async function resetDb(){await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');await pool.query(schema);}
beforeEach(resetDb);
after(async()=>{await pool.end();await appPool.end();});

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


test('pending relegation survives pair archival because it belongs to the exact duo',async()=>{
  const l=await maleLeague();const c=await category(4);
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('E','E','30000005','5','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('F','F','30000006','6','x','male') RETURNING id")).rows[0];
  const p=(await pool.query('INSERT INTO pairs(league_id,category_id,position) VALUES($1,$2,5) RETURNING id',[l.id,c.id])).rows[0];
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[p.id,u1.id,u2.id]);
  await pool.query('UPDATE pair_duo_state SET pending_relegation_category_id=$1,pending_relegation_losses=2,pending_relegation_started_at=CURRENT_TIMESTAMP WHERE league_id=$2 AND member_low_id=$3 AND member_high_id=$4',[c.id,l.id,u1.id,u2.id]);
  await pool.query("UPDATE pairs SET competition_state='inactive',archived_at=CURRENT_TIMESTAMP WHERE id=$1",[p.id]);
  const state=(await pool.query('SELECT pending_relegation_category_id,pending_relegation_losses FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[l.id,u1.id,u2.id])).rows[0];
  assert.equal(Number(state.pending_relegation_category_id),Number(c.id));
  assert.equal(Number(state.pending_relegation_losses),2);
});

test('same exact duo reuses one anti-abuse state across multiple pair incarnations',async()=>{
  const l=await maleLeague();const c=await category(3);
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('G','G','30000007','7','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('H','H','30000008','8','x','male') RETURNING id")).rows[0];

  for(const pos of [4,5]){
    const p=(await pool.query('INSERT INTO pairs(league_id,category_id,position,competition_state) VALUES($1,$2,$3,$4) RETURNING id',[l.id,c.id,pos,pos===4?'inactive':'active'])).rows[0];
    await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[p.id,u1.id,u2.id]);
  }

  const rows=(await pool.query('SELECT * FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[l.id,u1.id,u2.id])).rows;
  assert.equal(rows.length,1);
});

test('three-failure penalty state is internally coherent and preserves the exact duo streak',async()=>{
  const l=await maleLeague();const c=await category(6);
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('I','I','30000009','9','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('J','J','30000010','10','x','male') RETURNING id")).rows[0];
  const p=(await pool.query("INSERT INTO pairs(league_id,category_id,position,competition_state) VALUES($1,$2,3,'paused') RETURNING id",[l.id,c.id])).rows[0];
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[p.id,u1.id,u2.id]);

  await pool.query("UPDATE pair_wheel_state SET inactive_since=CURRENT_TIMESTAMP,return_position_base=3,inactive_reason='three_failures',auto_reactivate_at=CURRENT_TIMESTAMP+interval '30 days' WHERE pair_id=$1",[p.id]);
  await pool.query('UPDATE pair_duo_state SET failure_streak=3,penalty_until=CURRENT_TIMESTAMP+interval '30 days' WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[l.id,u1.id,u2.id]);

  const pairState=(await pool.query('SELECT inactive_reason,EXTRACT(EPOCH FROM (auto_reactivate_at-inactive_since)) seconds FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0];
  const duoState=(await pool.query('SELECT failure_streak,penalty_until FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[l.id,u1.id,u2.id])).rows[0];
  assert.equal(pairState.inactive_reason,'three_failures');
  assert.equal(Number(pairState.seconds),30*24*60*60);
  assert.equal(Number(duoState.failure_streak),3);
  assert.ok(duoState.penalty_until);
});

test('relegation state cannot point to a category in another circuit',async()=>{
  const male=await maleLeague();const female=(await pool.query("SELECT id FROM leagues WHERE slug='femenino'")).rows[0];
  const femaleCat=await category(4,'femenino');
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('K','K','30000011','11','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('L','L','30000012','12','x','male') RETURNING id")).rows[0];
  assert.notEqual(Number(male.id),Number(female.id));
  await assert.rejects(
    pool.query('INSERT INTO pair_duo_state(league_id,member_low_id,member_high_id,pending_relegation_category_id,pending_relegation_started_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)',[male.id,u1.id,u2.id,femaleCat.id]),
  );
});

test('cancelled assignment keeps enough state to accept only matches played before cancellation',async()=>{
  const l=await maleLeague();const c=await category(2);const a=await seedPair(1,2);const b=await seedPair(2,2);
  const row=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,cancelled_at,status) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP,'cancelled') RETURNING id,cancelled_at",
    [l.id,c.id,a.id,b.id],
  )).rows[0];
  const before=(await pool.query("SELECT ($1::timestamptz-interval '1 minute') <= $1::timestamptz ok",[row.cancelled_at])).rows[0].ok;
  const after=(await pool.query("SELECT ($1::timestamptz+interval '1 minute') <= $1::timestamptz ok",[row.cancelled_at])).rows[0].ok;
  assert.equal(before,true);
  assert.equal(after,false);
});

test('first_result_at is independent from played_at and can protect an already-loaded result',async()=>{
  const l=await maleLeague();const c=await category(2);const a=await seedPair(1,2);const b=await seedPair(2,2);
  const row=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,first_result_at,status) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP,'result_pending') RETURNING first_result_at",
    [l.id,c.id,a.id,b.id],
  )).rows[0];
  assert.ok(row.first_result_at);
});


test('preparation patch upgrades an already-prepared older v3 schema',async()=>{
  await pool.query('ALTER TABLE pair_wheel_state DROP COLUMN defense_required_until_real');
  await pool.query('ALTER TABLE pair_wheel_state DROP COLUMN awaiting_zone_kind');
  await pool.query('ALTER TABLE pair_duo_state DROP COLUMN relegation_route_step CASCADE');
  await pool.query(patch);
  const pairCols=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='pair_wheel_state' AND column_name IN('defense_required_until_real','awaiting_zone_kind') ORDER BY column_name")).rows.map(r=>r.column_name);
  const duoCols=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='pair_duo_state' AND column_name='relegation_route_step'")).rows.map(r=>r.column_name);
  assert.deepEqual(pairCols,['awaiting_zone_kind','defense_required_until_real']);
  assert.deepEqual(duoCols,['relegation_route_step']);
});

test('formation enabling match remembers which zone it belongs to',async()=>{
  const p=await seedPair(1,3);
  await pool.query("UPDATE pair_wheel_state SET awaiting_zone_first_match=true,awaiting_zone_kind='promotion' WHERE pair_id=$1",[p.id]);
  const state=(await pool.query('SELECT awaiting_zone_first_match,awaiting_zone_kind FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0];
  assert.equal(state.awaiting_zone_first_match,true);
  assert.equal(state.awaiting_zone_kind,'promotion');
});

test('zone enabling state cannot be left half-defined',async()=>{
  const p=await seedPair(1,4);
  await assert.rejects(pool.query("UPDATE pair_wheel_state SET awaiting_zone_first_match=true,awaiting_zone_kind=NULL WHERE pair_id=$1",[p.id]));
  await assert.rejects(pool.query("UPDATE pair_wheel_state SET awaiting_zone_first_match=false,awaiting_zone_kind='relegation' WHERE pair_id=$1",[p.id]));
});

test('real match resets v3 wait but administrative forfeit does not',async()=>{
  const l=await maleLeague();const c=await category(3);
  const a=await seedPair(1,3);const b=await seedPair(2,3);
  await pool.query("UPDATE pair_wheel_state SET real_waiting_since=CURRENT_TIMESTAMP-interval '20 days' WHERE pair_id IN($1,$2)",[a.id,b.id]);
  const played=(await pool.query("SELECT CURRENT_TIMESTAMP-interval '2 days' t")).rows[0].t;
  await pool.query("INSERT INTO matches(league_id,category_number,pair_a_id,pair_b_id,winner_pair_id,result_type,played_at,resolution_source) VALUES($1,3,$2,$3,$2,'normal',$4,'test')",[l.id,a.id,b.id,played]);
  const afterReal=(await pool.query('SELECT pair_id,real_waiting_since FROM pair_wheel_state WHERE pair_id IN($1,$2) ORDER BY pair_id',[a.id,b.id])).rows;
  assert.equal(new Date(afterReal[0].real_waiting_since).getTime(),new Date(played).getTime());
  assert.equal(new Date(afterReal[1].real_waiting_since).getTime(),new Date(played).getTime());

  const cpair=await seedPair(3,3);const dpair=await seedPair(4,3);
  const old=(await pool.query("SELECT CURRENT_TIMESTAMP-interval '25 days' t")).rows[0].t;
  await pool.query('UPDATE pair_wheel_state SET real_waiting_since=$1 WHERE pair_id IN($2,$3)',[old,cpair.id,dpair.id]);
  await pool.query("INSERT INTO matches(league_id,category_number,pair_a_id,pair_b_id,winner_pair_id,result_type,played_at,resolution_source) VALUES($1,3,$2,$3,$2,'dissolution_forfeit',CURRENT_TIMESTAMP,'test')",[l.id,cpair.id,dpair.id]);
  const afterAdmin=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[cpair.id])).rows[0].real_waiting_since;
  assert.equal(new Date(afterAdmin).getTime(),new Date(old).getTime());
});

test('reactivation restarts v3 wait from PostgreSQL time',async()=>{
  const p=await seedPair(1,5);
  await pool.query("UPDATE pairs SET competition_state='paused' WHERE id=$1",[p.id]);
  await pool.query("UPDATE pair_wheel_state SET real_waiting_since=CURRENT_TIMESTAMP-interval '40 days',inactive_since=CURRENT_TIMESTAMP-interval '10 days',return_position_base=1,inactive_reason='voluntary' WHERE pair_id=$1",[p.id]);
  const before=(await pool.query('SELECT CURRENT_TIMESTAMP t')).rows[0].t;
  await pool.query("UPDATE pairs SET competition_state='active' WHERE id=$1",[p.id]);
  const after=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0].real_waiting_since;
  assert.ok(new Date(after).getTime()>=new Date(before).getTime());
});

test('new and re-formed pairs start a fresh v3 wait clock',async()=>{
  const l=await maleLeague();const c=await category(4);
  const beforeNew=(await pool.query('SELECT CURRENT_TIMESTAMP t')).rows[0].t;
  const p=(await pool.query('INSERT INTO pairs(league_id,category_id,position) VALUES($1,$2,1) RETURNING id',[l.id,c.id])).rows[0];
  const created=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0].real_waiting_since;
  assert.ok(new Date(created).getTime()>=new Date(beforeNew).getTime());
  await pool.query("UPDATE pairs SET competition_state='inactive' WHERE id=$1",[p.id]);
  await pool.query("UPDATE pair_wheel_state SET real_waiting_since=CURRENT_TIMESTAMP-interval '50 days' WHERE pair_id=$1",[p.id]);
  const beforeReturn=(await pool.query('SELECT CURRENT_TIMESTAMP t')).rows[0].t;
  await pool.query("UPDATE pairs SET competition_state='active' WHERE id=$1",[p.id]);
  const returned=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[p.id])).rows[0].real_waiting_since;
  assert.ok(new Date(returned).getTime()>=new Date(beforeReturn).getTime());
});


test('formation snapshot is separate per circuit and completes only at 5x7',async()=>{
  const male=await maleLeague();
  for(let categoryNumber=1;categoryNumber<=7;categoryNumber++){
    for(let position=1;position<=5;position++)await seedPair(position,categoryNumber);
  }
  const snapshot=await wheelV3FormationSnapshot(pool,male.id);
  assert.equal(snapshot.complete,true);
  await pool.query("UPDATE pairs SET competition_state='paused' WHERE category_id=(SELECT c.id FROM categories c JOIN leagues l ON l.id=c.league_id WHERE l.slug='masculino' AND c.number=4) AND position=5");
  const after=await wheelV3FormationSnapshot(pool,male.id);
  assert.equal(after.complete,false);
});

test('PostgreSQL category planner uses v3 wait, roles and last real opponent without mutating runtime',async()=>{
  const l=await maleLeague();const c=await category(5);
  const pairs=[];
  for(let position=1;position<=6;position++)pairs.push(await seedPair(position,5));
  const waits=[
    '2026-09-01T00:00:00Z',
    '2026-09-02T00:00:00Z',
    '2026-09-03T00:00:00Z',
    '2026-09-04T00:00:00Z',
    '2026-09-05T00:00:00Z',
    '2026-09-06T00:00:00Z',
  ];
  for(let i=0;i<pairs.length;i++){
    await pool.query('UPDATE pair_wheel_state SET real_waiting_since=$2,role=NULL,role_streak=0 WHERE pair_id=$1',[pairs[i].id,waits[i]]);
  }
  const plan=await planWheelV3Category(pool,c.id);
  assert.equal(plan.pairs[0].role,'defense');
  assert.equal(plan.pairs.at(-1).role,'attack');
  const assignmentPairs=new Set(plan.assignments.flatMap(x=>[x.attackerId,x.defenderId]));
  assert.equal(assignmentPairs.size,plan.assignments.length*2);
  for(const assignment of plan.assignments){
    const attacker=plan.pairs.find(p=>p.id===assignment.attackerId);
    const defender=plan.pairs.find(p=>p.id===assignment.defenderId);
    assert.ok(attacker.position>defender.position);
  }
  const engine=(await pool.query("SELECT value#>>'{}' value FROM app_settings WHERE key='engine'")).rows[0].value;
  assert.equal(engine,'wheel-v2');
});
