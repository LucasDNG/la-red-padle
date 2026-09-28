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
const {planWheelV3Category,wheelV3FormationSnapshot,completeWheelV3FormationIfReady,createWheelV3AssignmentsForCategory,cancelInvalidWheelV3AssignmentsForCategory,registerWheelV3FirstResult,wheelV3CancelledResultEligibility,applyWheelV3ConfirmedRealResult,applyWheelV3OneSidedFailure,applyWheelV3BothFailure,reactivateWheelV3Pair,reactivateDueWheelV3Penalties,requestWheelV3Inactivity,reportWheelV3NoShow,cancelWheelV3NoShow,contestWheelV3NoShow,acceptWheelV3NoShow,escalateExpiredWheelV3NoShows,submitWheelV3ResultVersion,confirmWheelV3Result,autoValidateDueWheelV3Results,expireDueWheelV3Assignments,expireWheelV3ScheduleProposals}=await import('../../src/wheelV3Engine.js');
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
async function seedPairWithMembers(position=1,categoryNumber=3,{memberCategories=[categoryNumber,categoryNumber],tag=0}={}){
  const p=await seedPair(position,categoryNumber);
  const base=60000000+categoryNumber*1000+position*10+tag*2;
  const users=[];
  for(let i=0;i<2;i++){
    users.push((await pool.query(
      'INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender,current_category_number) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,current_category_number',
      ['V3','P'+(i+1),String(base+i),String(base+i),'x','male',memberCategories[i]],
    )).rows[0]);
  }
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[p.id,users[0].id,users[1].id]);
  return {...p,members:users};
}

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


test('formation completion persists once and never reopens',async()=>{
  const male=await maleLeague();
  for(let categoryNumber=1;categoryNumber<=7;categoryNumber++){
    for(let position=1;position<=5;position++)await seedPair(position,categoryNumber);
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const first=await completeWheelV3FormationIfReady(client,male.id);
    assert.equal(first.completed,true);
    assert.ok(first.completedAt);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  await pool.query("UPDATE pairs SET competition_state='paused' WHERE category_id=(SELECT c.id FROM categories c JOIN leagues l ON l.id=c.league_id WHERE l.slug='masculino' AND c.number=7) AND position=5");

  const client2=await pool.connect();
  try{
    await client2.query('BEGIN');
    const second=await completeWheelV3FormationIfReady(client2,male.id);
    assert.equal(second.completed,false);
    assert.equal(second.alreadyCompleted,true);
    assert.ok(second.completedAt);
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
});

test('isolated Wheel v3 assignment writer persists roles and 30-day DB-authored commitments',async()=>{
  const c=await category(6);
  const pairs=[];
  for(let position=1;position<=6;position++)pairs.push(await seedPair(position,6));
  for(let i=0;i<pairs.length;i++){
    await pool.query('UPDATE pair_wheel_state SET real_waiting_since=$2,role=NULL,role_streak=0 WHERE pair_id=$1',[
      pairs[i].id,
      new Date(Date.UTC(2026,8,1+i)).toISOString(),
    ]);
  }

  const client=await pool.connect();
  let result;
  try{
    await client.query('BEGIN');
    result=await createWheelV3AssignmentsForCategory(client,c.id);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.ok(result.created.length>=1);
  const participants=(await pool.query('SELECT pair_id,count(*)::int n FROM wheel_assignment_participants GROUP BY pair_id')).rows;
  assert.ok(participants.every(r=>Number(r.n)===1));

  for(const a of result.created){
    assert.equal(Number(a.attacker_pair_id),Number(a.pair_a_id));
    assert.equal(Number(a.defender_pair_id),Number(a.pair_b_id));
    const seconds=Number((await pool.query(
      'SELECT EXTRACT(EPOCH FROM ($1::timestamptz-$2::timestamptz)) seconds',
      [a.deadline_at,a.assigned_at],
    )).rows[0].seconds);
    assert.equal(seconds,30*24*60*60);
  }

  const roles=(await pool.query('SELECT p.position,pws.role FROM pairs p JOIN pair_wheel_state pws ON pws.pair_id=p.id WHERE p.category_id=$1 ORDER BY p.position',[c.id])).rows;
  assert.equal(roles[0].role,'defense');
  assert.equal(roles.at(-1).role,'attack');

  const engine=(await pool.query("SELECT value#>>'{}' value FROM app_settings WHERE key='engine'")).rows[0].value;
  assert.equal(engine,'wheel-v2');
});

test('isolated Wheel v3 assignment writer is serialized by category and does not double-assign pairs',async()=>{
  const c=await category(2);
  for(let position=1;position<=6;position++)await seedPair(position,2);

  const run=async()=>{
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const result=await createWheelV3AssignmentsForCategory(client,c.id);
      await client.query('COMMIT');
      return result.created.length;
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  };

  const [a,b]=await Promise.all([run(),run()]);
  assert.ok(a+b>=1);
  const duplicates=(await pool.query('SELECT pair_id,count(*) n FROM wheel_assignment_participants GROUP BY pair_id HAVING count(*)>1')).rows;
  assert.deepEqual(duplicates,[]);
});


test('structural cancellation preserves pair roles and v3 real wait',async()=>{
  const c=await category(3);
  const attacker=await seedPair(5,3);
  const defender=await seedPair(4,3);
  await pool.query("UPDATE pair_wheel_state SET role='attack',role_streak=1,real_waiting_since='2026-09-01T00:00:00Z' WHERE pair_id=$1",[attacker.id]);
  await pool.query("UPDATE pair_wheel_state SET role='defense',role_streak=1,real_waiting_since='2026-09-02T00:00:00Z' WHERE pair_id=$1",[defender.id]);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) SELECT league_id,$1,$2,$3,$2,$3 FROM categories WHERE id=$1 RETURNING *",
    [c.id,attacker.id,defender.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,attacker.id,defender.id]);

  await pool.query('UPDATE pairs SET position=3 WHERE id=$1',[attacker.id]);
  await pool.query('UPDATE pairs SET position=4 WHERE id=$1',[defender.id]);

  const client=await pool.connect();
  let cancelled;
  try{
    await client.query('BEGIN');
    cancelled=await cancelInvalidWheelV3AssignmentsForCategory(client,c.id);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(cancelled.length,1);
  assert.equal(cancelled[0].close_reason,'system_ranking_cancel');
  assert.ok(cancelled[0].cancelled_at);
  assert.equal(Number((await pool.query('SELECT count(*) n FROM wheel_assignment_participants WHERE assignment_id=$1',[a.id])).rows[0].n),0);
  const states=(await pool.query('SELECT pair_id,role,real_waiting_since FROM pair_wheel_state WHERE pair_id IN($1,$2) ORDER BY pair_id',[attacker.id,defender.id])).rows;
  assert.equal(states[0].role,'attack');
  assert.equal(states[1].role,'defense');
  assert.equal(new Date(states[0].real_waiting_since).toISOString(),'2026-09-01T00:00:00.000Z');
  assert.equal(new Date(states[1].real_waiting_since).toISOString(),'2026-09-02T00:00:00.000Z');
});

test('first result protects assignment from later structural cancellation and starts exact 7-day review',async()=>{
  const c=await category(4);
  const attacker=await seedPair(5,4);
  const defender=await seedPair(4,4);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) SELECT league_id,$1,$2,$3,$2,$3 FROM categories WHERE id=$1 RETURNING *",
    [c.id,attacker.id,defender.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,attacker.id,defender.id]);

  const client=await pool.connect();
  let marked;
  try{
    await client.query('BEGIN');
    marked=await registerWheelV3FirstResult(client,a.id);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.ok(marked.first_result_at);
  assert.equal(Number((await pool.query('SELECT EXTRACT(EPOCH FROM (confirmation_deadline_at-first_result_at)) seconds FROM wheel_assignments WHERE id=$1',[a.id])).rows[0].seconds),7*24*60*60);

  await pool.query('UPDATE pairs SET position=3 WHERE id=$1',[attacker.id]);
  await pool.query('UPDATE pairs SET position=4 WHERE id=$1',[defender.id]);

  const client2=await pool.connect();
  let cancelled;
  try{
    await client2.query('BEGIN');
    cancelled=await cancelInvalidWheelV3AssignmentsForCategory(client2,c.id);
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
  assert.equal(cancelled.length,0);
  const still=(await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[a.id])).rows[0];
  assert.equal(still.status,'result_pending');
});

test('cancelled assignment accepts only a match played before its authoritative cancellation time',async()=>{
  const c=await category(5);
  const attacker=await seedPair(4,5);
  const defender=await seedPair(3,5);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,status,cancelled_at,closed_at,close_reason) SELECT league_id,$1,$2,$3,$2,$3,'cancelled',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'system_ranking_cancel' FROM categories WHERE id=$1 RETURNING *",
    [c.id,attacker.id,defender.id],
  )).rows[0];
  const before=new Date(new Date(a.cancelled_at).getTime()-1000).toISOString();
  const after=new Date(new Date(a.cancelled_at).getTime()+1000).toISOString();
  assert.equal((await wheelV3CancelledResultEligibility(pool,a.id,before)).eligible,true);
  assert.equal((await wheelV3CancelledResultEligibility(pool,a.id,after)).eligible,false);
});


test('formation close initializes promotion and relegation zones atomically',async()=>{
  const male=await maleLeague();
  const seeded={};
  for(let categoryNumber=1;categoryNumber<=7;categoryNumber++){
    seeded[categoryNumber]=[];
    for(let position=1;position<=5;position++)seeded[categoryNumber].push(await seedPair(position,categoryNumber));
  }

  const bottom=seeded[3][4];
  const u1=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('Zone','One','50000001','5001','x','male') RETURNING id")).rows[0];
  const u2=(await pool.query("INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender) VALUES('Zone','Two','50000002','5002','x','male') RETURNING id")).rows[0];
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3)',[bottom.id,u1.id,u2.id]);

  const rival=seeded[3][3];
  await pool.query(
    "INSERT INTO matches(league_id,category_number,pair_a_id,pair_b_id,winner_pair_id,result_type,played_at,resolution_source) VALUES($1,3,$2,$3,$3,'normal',CURRENT_TIMESTAMP-interval '1 day','test')",
    [male.id,bottom.id,rival.id],
  );

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const result=await completeWheelV3FormationIfReady(client,male.id);
    assert.equal(result.completed,true);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const top2=seeded[2][0];
  const promotion=(await pool.query('SELECT promotion_wins,awaiting_zone_first_match,awaiting_zone_kind FROM pair_wheel_state WHERE pair_id=$1',[top2.id])).rows[0];
  assert.equal(Number(promotion.promotion_wins),0);
  assert.equal(promotion.awaiting_zone_first_match,true);
  assert.equal(promotion.awaiting_zone_kind,'promotion');

  const bottomState=(await pool.query(
    'SELECT pending_relegation_category_id,pending_relegation_losses,relegation_route_step,pending_relegation_started_at FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',
    [male.id,u1.id,u2.id],
  )).rows[0];
  assert.equal(Number(bottomState.pending_relegation_category_id),Number((await category(3)).id));
  assert.equal(Number(bottomState.pending_relegation_losses),0);
  assert.equal(Number(bottomState.relegation_route_step),0);
  assert.ok(bottomState.pending_relegation_started_at);
});

test('formation close marks zero-PJ bottom as awaiting relegation rather than opening duo period early',async()=>{
  const male=await maleLeague();
  const seeded={};
  for(let categoryNumber=1;categoryNumber<=7;categoryNumber++){
    seeded[categoryNumber]=[];
    for(let position=1;position<=5;position++)seeded[categoryNumber].push(await seedPair(position,categoryNumber));
  }
  const bottom=seeded[4][4];

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await completeWheelV3FormationIfReady(client,male.id);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const state=(await pool.query('SELECT awaiting_zone_first_match,awaiting_zone_kind FROM pair_wheel_state WHERE pair_id=$1',[bottom.id])).rows[0];
  assert.equal(state.awaiting_zone_first_match,true);
  assert.equal(state.awaiting_zone_kind,'relegation');
});


test('late historical real result never moves v3 wait backwards',async()=>{
  const l=await maleLeague();const c=await category(3);
  const a=await seedPair(1,3);const b=await seedPair(2,3);
  await pool.query("UPDATE pair_wheel_state SET real_waiting_since='2026-09-25T00:00:00Z' WHERE pair_id IN($1,$2)",[a.id,b.id]);
  await pool.query(
    "INSERT INTO matches(league_id,category_number,pair_a_id,pair_b_id,winner_pair_id,result_type,played_at,resolution_source) VALUES($1,3,$2,$3,$2,'normal','2026-09-20T00:00:00Z','late-test')",
    [l.id,a.id,b.id],
  );
  const rows=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id IN($1,$2)',[a.id,b.id])).rows;
  assert.ok(rows.every(r=>new Date(r.real_waiting_since).toISOString()==='2026-09-25T00:00:00.000Z'));
});


test('one-sided failure moves violator only downward, preserves rival wait and imposes defense',async()=>{
  const c=await category(3);
  await seedPair(1,3);
  const failing=await seedPairWithMembers(2,3,{tag:20});
  const rival=await seedPairWithMembers(3,3,{tag:21});
  await seedPair(4,3);
  await pool.query("UPDATE pair_wheel_state SET role='defense',role_streak=1,real_waiting_since='2026-09-01T00:00:00Z' WHERE pair_id=$1",[failing.id]);
  await pool.query("UPDATE pair_wheel_state SET role='attack',role_streak=1,real_waiting_since='2026-09-02T00:00:00Z' WHERE pair_id=$1",[rival.id]);
  await pool.query('UPDATE pair_duo_state SET failure_streak=1 WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[
    failing.league_id,
    Math.min(Number(failing.members[0].id),Number(failing.members[1].id)),
    Math.max(Number(failing.members[0].id),Number(failing.members[1].id)),
  ]);
  await pool.query('UPDATE pair_duo_state SET failure_streak=2 WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[
    rival.league_id,
    Math.min(Number(rival.members[0].id),Number(rival.members[1].id)),
    Math.max(Number(rival.members[0].id),Number(rival.members[1].id)),
  ]);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id",
    [failing.league_id,c.id,failing.id,rival.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,failing.id,rival.id]);

  const client=await pool.connect();
  let result;
  try{
    await client.query('BEGIN');
    result=await applyWheelV3OneSidedFailure(client,{assignmentId:a.id,failingPairId:failing.id,resolutionSource:'self_failure'});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(result.swapped,true);
  assert.equal(result.penalty30Days,false);
  const positions=(await pool.query('SELECT id,position FROM pairs WHERE id IN($1,$2) ORDER BY id',[failing.id,rival.id])).rows;
  const byId=Object.fromEntries(positions.map(r=>[Number(r.id),Number(r.position)]));
  assert.equal(byId[Number(failing.id)],3);
  assert.equal(byId[Number(rival.id)],2);
  const failingState=(await pool.query('SELECT role,defense_required_until_real,real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[failing.id])).rows[0];
  const rivalState=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[rival.id])).rows[0];
  assert.equal(failingState.role,'defense');
  assert.equal(failingState.defense_required_until_real,true);
  assert.equal(new Date(failingState.real_waiting_since).toISOString(),'2026-09-01T00:00:00.000Z');
  assert.equal(new Date(rivalState.real_waiting_since).toISOString(),'2026-09-02T00:00:00.000Z');
  const failingDuo=(await pool.query('SELECT failure_streak FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[
    failing.league_id,
    Math.min(Number(failing.members[0].id),Number(failing.members[1].id)),
    Math.max(Number(failing.members[0].id),Number(failing.members[1].id)),
  ])).rows[0];
  const rivalDuo=(await pool.query('SELECT failure_streak FROM pair_duo_state WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[
    rival.league_id,
    Math.min(Number(rival.members[0].id),Number(rival.members[1].id)),
    Math.max(Number(rival.members[0].id),Number(rival.members[1].id)),
  ])).rows[0];
  assert.equal(Number(failingDuo.failure_streak),2);
  assert.equal(Number(rivalDuo.failure_streak),0);
});

test('third failure that leaves violator last descends first and then applies 30-day inactivity',async()=>{
  const male=await maleLeague();
  for(let n=1;n<=7;n++)for(let p=1;p<=5;p++)await seedPair(p,n);
  const c4=await category(4);
  const failing=(await pool.query('SELECT * FROM pairs WHERE category_id=$1 AND position=4',[c4.id])).rows[0];
  const rival=(await pool.query('SELECT * FROM pairs WHERE category_id=$1 AND position=5',[c4.id])).rows[0];
  const base=63000000;
  const ids=[];
  for(let i=0;i<4;i++)ids.push((await pool.query(
    "INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender,current_category_number) VALUES('Fail',$1,$2,$2,'x','male',4) RETURNING id",
    [String(i),String(base+i)],
  )).rows[0].id);
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3),($4,$5),($4,$6)',[failing.id,ids[0],ids[1],rival.id,ids[2],ids[3]]);
  await pool.query("UPDATE league_wheel_state SET formation_completed_at=CURRENT_TIMESTAMP WHERE league_id=$1",[male.id]);
  await pool.query('UPDATE pair_duo_state SET failure_streak=2 WHERE league_id=$1 AND member_low_id=$2 AND member_high_id=$3',[male.id,Math.min(Number(ids[0]),Number(ids[1])),Math.max(Number(ids[0]),Number(ids[1]))]);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id",
    [male.id,c4.id,failing.id,rival.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,failing.id,rival.id]);

  const client=await pool.connect();
  let result;
  try{
    await client.query('BEGIN');
    result=await applyWheelV3OneSidedFailure(client,{assignmentId:a.id,failingPairId:failing.id,resolutionSource:'self_failure'});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(result.penalty30Days,true);
  assert.equal(result.movements.some(m=>m.type==='relegation'),true);
  const moved=(await pool.query('SELECT c.number,p.position,p.competition_state FROM pairs p JOIN categories c ON c.id=p.category_id WHERE p.id=$1',[failing.id])).rows[0];
  assert.equal(Number(moved.number),5);
  assert.equal(moved.competition_state,'paused');
  const inactive=(await pool.query('SELECT inactive_reason,return_position_base,EXTRACT(EPOCH FROM (auto_reactivate_at-inactive_since)) seconds FROM pair_wheel_state WHERE pair_id=$1',[failing.id])).rows[0];
  assert.equal(inactive.inactive_reason,'three_failures');
  assert.equal(Number(inactive.return_position_base),2);
  assert.equal(Number(inactive.seconds),30*24*60*60);
});

test('accepted no-show can count as a First-place defense without resetting real wait',async()=>{
  const c=await category(1);
  const leader=await seedPairWithMembers(1,1,{tag:22});
  const attacker=await seedPairWithMembers(2,1,{tag:23});
  await pool.query("UPDATE pair_wheel_state SET role='defense',role_streak=1,real_waiting_since='2026-09-01T00:00:00Z' WHERE pair_id=$1",[leader.id]);
  await pool.query("UPDATE pair_wheel_state SET role='attack',role_streak=1,real_waiting_since='2026-09-02T00:00:00Z' WHERE pair_id=$1",[attacker.id]);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$3,$4) RETURNING id",
    [leader.league_id,c.id,attacker.id,leader.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,attacker.id,leader.id]);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await applyWheelV3OneSidedFailure(client,{
      assignmentId:a.id,
      failingPairId:attacker.id,
      resolutionSource:'no_show_accepted',
      countsAsFirstPlaceDefense:true,
    });
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const reign=(await pool.query('SELECT pair_id,defenses,ended_at FROM first_place_reigns WHERE league_id=$1 AND ended_at IS NULL',[leader.league_id])).rows[0];
  assert.equal(Number(reign.pair_id),Number(leader.id));
  assert.equal(Number(reign.defenses),1);
  const wait=(await pool.query('SELECT real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[leader.id])).rows[0].real_waiting_since;
  assert.equal(new Date(wait).toISOString(),'2026-09-01T00:00:00.000Z');
});


test('temporary inactivity compacts active ranking and reactivation reinserts at stored return position',async()=>{
  const c=await category(6);
  const p1=await seedPair(1,6);
  const p2=await seedPairWithMembers(2,6,{tag:30});
  const p3=await seedPair(3,6);
  const duo=(await pool.query('SELECT id FROM pair_duo_state WHERE league_id=$1 ORDER BY id DESC LIMIT 1',[p2.league_id])).rows[0];
  await pool.query("UPDATE pairs SET competition_state='paused',position=999999 WHERE id=$1",[p2.id]);
  await pool.query("UPDATE pair_wheel_state SET inactive_since=CURRENT_TIMESTAMP-interval '20 days',return_position_base=2,inactive_reason='three_failures',auto_reactivate_at=CURRENT_TIMESTAMP-interval '1 second' WHERE pair_id=$1",[p2.id]);
  await pool.query("UPDATE pair_duo_state SET penalty_until=CURRENT_TIMESTAMP-interval '1 second' WHERE id=$1",[duo.id]);
  await pool.query('UPDATE pairs SET position=2 WHERE id=$1',[p3.id]);
  await pool.query('UPDATE pairs SET position=3 WHERE id=$1',[p2.id]);

  const client=await pool.connect();
  let result;
  try{
    await client.query('BEGIN');
    result=await reactivateWheelV3Pair(client,p2.id);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(result.position,2);
  const order=(await pool.query('SELECT id,position,competition_state FROM pairs WHERE category_id=$1 ORDER BY position',[c.id])).rows;
  assert.deepEqual(order.map(r=>Number(r.id)),[Number(p1.id),Number(p2.id),Number(p3.id)]);
  assert.equal(order[1].competition_state,'active');
  const state=(await pool.query('SELECT inactive_since,return_position_base,inactive_reason,auto_reactivate_at,role,real_waiting_since FROM pair_wheel_state WHERE pair_id=$1',[p2.id])).rows[0];
  assert.equal(state.inactive_since,null);
  assert.equal(state.return_position_base,null);
  assert.equal(state.inactive_reason,null);
  assert.equal(state.auto_reactivate_at,null);
  assert.equal(state.role,null);
  assert.ok(state.real_waiting_since);
});

test('due 30-day sanctions auto-reactivate by PostgreSQL time and future ones stay paused',async()=>{
  const c=await category(7);
  const due=await seedPairWithMembers(1,7,{tag:31});
  const future=await seedPairWithMembers(2,7,{tag:32});
  for(const [pair,offset] of [[due,'-1 second'],[future,'+1 day']]){
    await pool.query("UPDATE pairs SET competition_state='paused' WHERE id=$1",[pair.id]);
    await pool.query(`UPDATE pair_wheel_state SET inactive_since=CURRENT_TIMESTAMP-interval '30 days',return_position_base=position,inactive_reason='three_failures',auto_reactivate_at=CURRENT_TIMESTAMP${offset.startsWith('+')?'+':'-'}interval '${offset.replace(/[+-]/,'')}' FROM pairs WHERE pair_wheel_state.pair_id=$1 AND pairs.id=$1`,[pair.id]);
  }

  const client=await pool.connect();
  let rows;
  try{
    await client.query('BEGIN');
    rows=await reactivateDueWheelV3Penalties(client);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(rows.length,1);
  assert.equal(rows[0].pairId,Number(due.id));
  const states=(await pool.query('SELECT id,competition_state FROM pairs WHERE id IN($1,$2) ORDER BY id',[due.id,future.id])).rows;
  const byId=Object.fromEntries(states.map(r=>[Number(r.id),r.competition_state]));
  assert.equal(byId[Number(due.id)],'active');
  assert.equal(byId[Number(future.id)],'paused');
});


test('simultaneous failure makes both sanctioned pairs lose exactly one effective place',async()=>{
  const c=await category(3);
  const pairs=[];
  for(let position=1;position<=8;position++){
    pairs.push(position===5||position===6
      ?await seedPairWithMembers(position,3,{tag:40+position})
      :await seedPair(position,3));
  }
  const p5=pairs[4],p6=pairs[5];
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$3,$4) RETURNING id",
    [p5.league_id,c.id,p5.id,p6.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,p5.id,p6.id]);

  const client=await pool.connect();
  let result;
  try{
    await client.query('BEGIN');
    result=await applyWheelV3BothFailure(client,{assignmentId:a.id});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const order=(await pool.query('SELECT id FROM pairs WHERE category_id=$1 AND competition_state=\'active\' ORDER BY position',[c.id])).rows.map(r=>Number(r.id));
  assert.deepEqual(order,[
    Number(pairs[0].id),Number(pairs[1].id),Number(pairs[2].id),Number(pairs[3].id),
    Number(pairs[6].id),Number(p5.id),Number(p6.id),Number(pairs[7].id),
  ]);
  assert.equal(result.movements.length,0);
  assert.deepEqual(result.penalties30Days,[]);
});

test('bottom simultaneous penalties accrue future position debt when no lower pair exists',async()=>{
  const c=await category(4);
  const pairs=[];
  for(let position=1;position<=6;position++){
    pairs.push(position>=5
      ?await seedPairWithMembers(position,4,{tag:50+position})
      :await seedPair(position,4));
  }
  const p5=pairs[4],p6=pairs[5];
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$3,$4) RETURNING id",
    [p5.league_id,c.id,p5.id,p6.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,p5.id,p6.id]);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await applyWheelV3BothFailure(client,{assignmentId:a.id});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const debts=(await pool.query('SELECT id,position_debt FROM pairs WHERE id IN($1,$2) ORDER BY id',[p5.id,p6.id])).rows;
  assert.ok(debts.every(r=>Number(r.position_debt)===1));
});

test('future insertion that pushes an indebted pair down consumes one debt',async()=>{
  const male=await maleLeague();
  const seeded={};
  for(let n=1;n<=7;n++){
    seeded[n]=[];
    for(let p=1;p<=5;p++)seeded[n].push(await seedPair(p,n));
  }
  const leader=seeded[3][0];
  const challenger=seeded[3][1];
  const targetLast=seeded[2][4];
  await pool.query('UPDATE pairs SET position_debt=1 WHERE id=$1',[targetLast.id]);

  const base=64000000;
  const ids=[];
  for(let i=0;i<4;i++)ids.push((await pool.query(
    "INSERT INTO users(first_name,last_name,dni,phone,password_hash,gender,current_category_number) VALUES('Debt',$1,$2,$2,'x','male',3) RETURNING id",
    [String(i),String(base+i)],
  )).rows[0].id);
  await pool.query('INSERT INTO pair_members(pair_id,user_id) VALUES($1,$2),($1,$3),($4,$5),($4,$6)',[leader.id,ids[0],ids[1],challenger.id,ids[2],ids[3]]);
  await pool.query("UPDATE league_wheel_state SET formation_completed_at=CURRENT_TIMESTAMP WHERE league_id=$1",[male.id]);
  await pool.query('UPDATE pair_wheel_state SET promotion_wins=2 WHERE pair_id=$1',[leader.id]);
  const c3=await category(3);
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,status,first_result_at,confirmation_deadline_at) VALUES($1,$2,$3,$4,$4,$3,'result_pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '7 days') RETURNING id",
    [male.id,c3.id,leader.id,challenger.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,leader.id,challenger.id]);

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await applyWheelV3ConfirmedRealResult(client,{
      assignmentId:a.id,
      winnerPairId:leader.id,
      resultType:'normal',
      score:{sets:[{pairA:6,pairB:1},{pairA:6,pairB:1}]},
      playedAt:'2026-09-28T20:00:00Z',
      resolutionSource:'test',
    });
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const last=(await pool.query('SELECT position,position_debt FROM pairs WHERE id=$1',[targetLast.id])).rows[0];
  assert.equal(Number(last.position),6);
  assert.equal(Number(last.position_debt),0);
});


test('voluntary inactivity without assignment applies immediately and compacts active ladder',async()=>{
  const c=await category(5);
  const p1=await seedPair(1,5);
  const p2=await seedPairWithMembers(2,5,{tag:60});
  const p3=await seedPair(3,5);
  const client=await pool.connect();
  let result;
  try{
    await client.query('BEGIN');
    result=await requestWheelV3Inactivity(client,{pairId:p2.id,requestedByUserId:p2.members[0].id});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(result.status,'paused');
  const active=(await pool.query("SELECT id,position FROM pairs WHERE category_id=$1 AND competition_state='active' ORDER BY position",[c.id])).rows;
  assert.deepEqual(active.map(r=>Number(r.id)),[Number(p1.id),Number(p3.id)]);
  assert.deepEqual(active.map(r=>Number(r.position)),[1,2]);
  const state=(await pool.query('SELECT return_position_base,inactive_reason FROM pair_wheel_state WHERE pair_id=$1',[p2.id])).rows[0];
  assert.equal(Number(state.return_position_base),2);
  assert.equal(state.inactive_reason,'voluntary');
});

test('voluntary inactivity requested during assignment waits for closure and then pauses automatically',async()=>{
  const c=await category(6);
  const defender=await seedPairWithMembers(1,6,{tag:61});
  const attacker=await seedPairWithMembers(2,6,{tag:62});
  const a=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,status,first_result_at,confirmation_deadline_at) VALUES($1,$2,$3,$4,$4,$3,'result_pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '7 days') RETURNING id",
    [defender.league_id,c.id,defender.id,attacker.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[a.id,defender.id,attacker.id]);

  const reqClient=await pool.connect();
  let request;
  try{
    await reqClient.query('BEGIN');
    request=await requestWheelV3Inactivity(reqClient,{pairId:attacker.id,requestedByUserId:attacker.members[0].id});
    await reqClient.query('COMMIT');
  }catch(e){await reqClient.query('ROLLBACK');throw e;}finally{reqClient.release();}
  assert.equal(request.status,'after_current');
  assert.equal((await pool.query('SELECT competition_state FROM pairs WHERE id=$1',[attacker.id])).rows[0].competition_state,'active');

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await applyWheelV3ConfirmedRealResult(client,{
      assignmentId:a.id,
      winnerPairId:defender.id,
      resultType:'normal',
      score:{sets:[{pairA:6,pairB:2},{pairA:6,pairB:2}]},
      playedAt:'2026-09-28T21:00:00Z',
      resolutionSource:'test',
    });
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const pair=(await pool.query('SELECT competition_state,pause_after_current FROM pairs WHERE id=$1',[attacker.id])).rows[0];
  assert.equal(pair.competition_state,'paused');
  assert.equal(pair.pause_after_current,false);
  const state=(await pool.query('SELECT inactive_reason,return_position_base FROM pair_wheel_state WHERE pair_id=$1',[attacker.id])).rows[0];
  assert.equal(state.inactive_reason,'voluntary');
  assert.ok(Number(state.return_position_base)>=1);
});


test('no-show can only be reported after official scheduled time and gets 48-hour reconsideration',async()=>{
  const c=await category(2);
  const a=await seedPairWithMembers(1,2,{tag:70});
  const b=await seedPairWithMembers(2,2,{tag:71});
  const future=(await pool.query("SELECT CURRENT_TIMESTAMP+interval '1 hour' t")).rows[0].t;
  const past=(await pool.query("SELECT CURRENT_TIMESTAMP-interval '1 minute' t")).rows[0].t;
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$4,$3,$5,'Cancha',CURRENT_TIMESTAMP) RETURNING id",
    [a.league_id,c.id,a.id,b.id,future],
  )).rows[0];

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assert.rejects(reportWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:a.id}));
    await client.query('ROLLBACK');
  }finally{client.release();}

  await pool.query('UPDATE wheel_assignments SET scheduled_at=$2 WHERE id=$1',[assignment.id,past]);
  const client2=await pool.connect();
  let report;
  try{
    await client2.query('BEGIN');
    report=await reportWheelV3NoShow(client2,{assignmentId:assignment.id,reportedByPairId:a.id});
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
  const seconds=Number((await pool.query('SELECT EXTRACT(EPOCH FROM (response_deadline_at-created_at)) seconds FROM wheel_no_shows WHERE id=$1',[report.id])).rows[0].seconds);
  assert.equal(seconds,48*60*60);
});

test('reporter can cancel no-show inside the 48-hour window',async()=>{
  const c=await category(3);
  const a=await seedPairWithMembers(1,3,{tag:72});
  const b=await seedPairWithMembers(2,3,{tag:73});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '1 minute','Cancha',CURRENT_TIMESTAMP-interval '1 hour') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await reportWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:a.id});
    const cancelled=await cancelWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:a.id});
    assert.equal(cancelled.status,'resolved');
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].status,'open');
});

test('contested no-show blocks assignment and expired unilateral report goes to admin review',async()=>{
  const c=await category(4);
  const a=await seedPairWithMembers(1,4,{tag:74});
  const b=await seedPairWithMembers(2,4,{tag:75});
  const one=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '1 minute','Cancha',CURRENT_TIMESTAMP-interval '1 hour') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await reportWheelV3NoShow(client,{assignmentId:one.id,reportedByPairId:a.id});
    const contested=await contestWheelV3NoShow(client,{assignmentId:one.id,reportedPairId:b.id});
    assert.equal(contested.status,'contested');
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[one.id])).rows[0].status,'disputed');

  await pool.query('DELETE FROM wheel_assignment_participants');
  const two=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '3 days','Cancha',CURRENT_TIMESTAMP-interval '4 days') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  await pool.query(
    "INSERT INTO wheel_no_shows(assignment_id,reported_by_pair_id,reported_pair_id,status,response_deadline_at,created_at) VALUES($1,$2,$3,'pending',CURRENT_TIMESTAMP-interval '1 second',CURRENT_TIMESTAMP-interval '49 hours')",
    [two.id,a.id,b.id],
  );
  const client2=await pool.connect();
  let escalated;
  try{
    await client2.query('BEGIN');
    escalated=await escalateExpiredWheelV3NoShows(client2);
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
  assert.equal(escalated.some(x=>Number(x.assignment_id)===Number(two.id)),true);
  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[two.id])).rows[0].status,'disputed');
});

test('reported pair acceptance resolves no-show immediately as administrative failure',async()=>{
  const c=await category(1);
  const leader=await seedPairWithMembers(1,1,{tag:76});
  const attacker=await seedPairWithMembers(2,1,{tag:77});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$3,$4,CURRENT_TIMESTAMP-interval '1 minute','Cancha',CURRENT_TIMESTAMP-interval '1 hour') RETURNING id",
    [leader.league_id,c.id,attacker.id,leader.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,attacker.id,leader.id]);

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await reportWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:leader.id});
    await acceptWheelV3NoShow(client,{assignmentId:assignment.id,reportedPairId:attacker.id,reportedByUserId:attacker.members[0].id});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const noShow=(await pool.query('SELECT status FROM wheel_no_shows WHERE assignment_id=$1',[assignment.id])).rows[0];
  assert.equal(noShow.status,'accepted');
  const closed=(await pool.query('SELECT status,close_reason FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0];
  assert.equal(closed.status,'confirmed');
  assert.equal(closed.close_reason,'no_show_accepted');
  const reign=(await pool.query('SELECT pair_id,defenses FROM first_place_reigns WHERE league_id=$1 AND ended_at IS NULL',[leader.league_id])).rows[0];
  assert.equal(Number(reign.pair_id),Number(leader.id));
  assert.equal(Number(reign.defenses),1);
});


test('cancelled no-show can be reported again after a later reschedule on the same assignment',async()=>{
  const c=await category(5);
  const a=await seedPairWithMembers(1,5,{tag:78});
  const b=await seedPairWithMembers(2,5,{tag:79});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '1 minute','Cancha',CURRENT_TIMESTAMP-interval '1 hour') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const first=await reportWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:a.id});
    await cancelWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:a.id});
    await pool.query("UPDATE wheel_assignments SET scheduled_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE id=$1",[assignment.id]);
    const second=await reportWheelV3NoShow(client,{assignmentId:assignment.id,reportedByPairId:a.id});
    assert.notEqual(Number(first.id),Number(second.id));
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  const reports=(await pool.query('SELECT status FROM wheel_no_shows WHERE assignment_id=$1 ORDER BY id',[assignment.id])).rows;
  assert.deepEqual(reports.map(r=>r.status),['resolved','pending']);
});


test('first submitted result starts one fixed 7-day review and later edits do not reset it',async()=>{
  const c=await category(2);
  const a=await seedPairWithMembers(1,2,{tag:80});
  const b=await seedPairWithMembers(2,2,{tag:81});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,a.id,b.id]);

  const client=await pool.connect();
  let first;
  try{
    await client.query('BEGIN');
    first=await submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,
      pairId:a.id,
      winnerPairId:a.id,
      resultType:'normal',
      playedAt:(await pool.query("SELECT CURRENT_TIMESTAMP t")).rows[0].t,
      score:{sets:[{pairA:6,pairB:3},{pairA:6,pairB:4}]},
    });
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal(first.status,'result_pending');

  const before=(await pool.query('SELECT first_result_at,confirmation_deadline_at FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0];
  const client2=await pool.connect();
  try{
    await client2.query('BEGIN');
    await submitWheelV3ResultVersion(client2,{
      assignmentId:assignment.id,
      pairId:a.id,
      winnerPairId:a.id,
      resultType:'normal',
      playedAt:(await pool.query("SELECT CURRENT_TIMESTAMP t")).rows[0].t,
      score:{sets:[{pairA:6,pairB:2},{pairA:6,pairB:4}]},
    });
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
  const after=(await pool.query('SELECT first_result_at,confirmation_deadline_at FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0];
  assert.equal(new Date(after.first_result_at).getTime(),new Date(before.first_result_at).getTime());
  assert.equal(new Date(after.confirmation_deadline_at).getTime(),new Date(before.confirmation_deadline_at).getTime());
});

test('matching versions from both pairs confirm immediately',async()=>{
  const c=await category(3);
  const defender=await seedPairWithMembers(1,3,{tag:82});
  const attacker=await seedPairWithMembers(2,3,{tag:83});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id",
    [defender.league_id,c.id,defender.id,attacker.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,defender.id,attacker.id]);
  const played=(await pool.query("SELECT CURRENT_TIMESTAMP t")).rows[0].t;
  const payload={
    assignmentId:assignment.id,
    winnerPairId:attacker.id,
    resultType:'normal',
    playedAt:played,
    score:{sets:[{pairA:3,pairB:6},{pairA:4,pairB:6}]},
  };

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const one=await submitWheelV3ResultVersion(client,{...payload,pairId:defender.id});
    assert.equal(one.status,'result_pending');
    const two=await submitWheelV3ResultVersion(client,{...payload,pairId:attacker.id});
    assert.equal(two.status,'confirmed');
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal(Number((await pool.query('SELECT count(*) n FROM matches WHERE assignment_id=$1',[assignment.id])).rows[0].n),1);
  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].status,'confirmed');
});

test('conflicting pair versions move assignment to disputed and never auto-validate',async()=>{
  const c=await category(4);
  const a=await seedPairWithMembers(1,4,{tag:84});
  const b=await seedPairWithMembers(2,4,{tag:85});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,a.id,b.id]);

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,pairId:a.id,winnerPairId:a.id,resultType:'normal',
      playedAt:(await pool.query("SELECT CURRENT_TIMESTAMP t")).rows[0].t,score:{sets:[{pairA:6,pairB:3},{pairA:6,pairB:3}]},
    });
    const conflict=await submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,pairId:b.id,winnerPairId:b.id,resultType:'normal',
      playedAt:(await pool.query("SELECT CURRENT_TIMESTAMP t")).rows[0].t,score:{sets:[{pairA:3,pairB:6},{pairA:3,pairB:6}]},
    });
    assert.equal(conflict.status,'disputed');
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  await pool.query("UPDATE wheel_assignments SET confirmation_deadline_at=CURRENT_TIMESTAMP-interval '1 second' WHERE id=$1",[assignment.id]);
  const client2=await pool.connect();
  let auto;
  try{
    await client2.query('BEGIN');
    auto=await autoValidateDueWheelV3Results(client2);
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
  assert.equal(auto.length,0);
  assert.equal(Number((await pool.query('SELECT count(*) n FROM matches WHERE assignment_id=$1',[assignment.id])).rows[0].n),0);
});

test('silence after seven days auto-validates the loaded result',async()=>{
  const c=await category(5);
  const defender=await seedPairWithMembers(1,5,{tag:86});
  const attacker=await seedPairWithMembers(2,5,{tag:87});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id) VALUES($1,$2,$3,$4,$4,$3) RETURNING id",
    [defender.league_id,c.id,defender.id,attacker.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,defender.id,attacker.id]);

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,pairId:attacker.id,winnerPairId:defender.id,resultType:'normal',
      playedAt:(await pool.query("SELECT CURRENT_TIMESTAMP t")).rows[0].t,score:{sets:[{pairA:6,pairB:4},{pairA:6,pairB:4}]},
    });
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await pool.query("UPDATE wheel_assignments SET confirmation_deadline_at=CURRENT_TIMESTAMP-interval '1 second' WHERE id=$1",[assignment.id]);

  const client2=await pool.connect();
  let auto;
  try{
    await client2.query('BEGIN');
    auto=await autoValidateDueWheelV3Results(client2);
    await client2.query('COMMIT');
  }catch(e){await client2.query('ROLLBACK');throw e;}finally{client2.release();}
  assert.equal(auto.length,1);
  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].status,'confirmed');
});

test('30-day assignment with no result or declaration becomes simultaneous failure',async()=>{
  const c=await category(7);
  const a=await seedPairWithMembers(1,7,{tag:88});
  const b=await seedPairWithMembers(2,7,{tag:89});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,assigned_at,deadline_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP-interval '1 day') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,a.id,b.id]);

  const client=await pool.connect();
  let expired;
  try{
    await client.query('BEGIN');
    expired=await expireDueWheelV3Assignments(client);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal(expired.length,1);
  assert.equal((await pool.query('SELECT close_reason FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].close_reason,'deadline_both_failure');
  const streaks=(await pool.query('SELECT failure_streak FROM pair_duo_state WHERE league_id=$1 ORDER BY id',[a.league_id])).rows;
  assert.ok(streaks.every(r=>Number(r.failure_streak)===1));
});


test('explicit confirmation applies the rival loaded result immediately',async()=>{
  const c=await category(6);
  const defender=await seedPairWithMembers(1,6,{tag:90});
  const attacker=await seedPairWithMembers(2,6,{tag:91});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,assigned_at,deadline_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '1 minute',CURRENT_TIMESTAMP+interval '30 days') RETURNING id",
    [defender.league_id,c.id,defender.id,attacker.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,defender.id,attacker.id]);

  const played=(await pool.query('SELECT CURRENT_TIMESTAMP t')).rows[0].t;
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,pairId:attacker.id,winnerPairId:defender.id,resultType:'normal',
      playedAt:played,score:{sets:[{pairA:6,pairB:2},{pairA:6,pairB:2}]},
    });
    await confirmWheelV3Result(client,{assignmentId:assignment.id,confirmingPairId:defender.id});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}

  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].status,'confirmed');
  assert.equal(Number((await pool.query('SELECT count(*) n FROM matches WHERE assignment_id=$1',[assignment.id])).rows[0].n),1);
});

test('valid match played before structural cancellation can be loaded afterward but edited played_at cannot cross cancellation',async()=>{
  const c=await category(5);
  const defender=await seedPairWithMembers(1,5,{tag:92});
  const attacker=await seedPairWithMembers(2,5,{tag:93});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,assigned_at,deadline_at,status,cancelled_at,closed_at,close_reason) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '2 hours',CURRENT_TIMESTAMP+interval '29 days','cancelled',CURRENT_TIMESTAMP-interval '30 minutes',CURRENT_TIMESTAMP-interval '30 minutes','system_ranking_cancel') RETURNING *",
    [defender.league_id,c.id,defender.id,attacker.id],
  )).rows[0];
  const validPlayed=new Date(new Date(assignment.cancelled_at).getTime()-10*60*1000);

  const client=await pool.connect();
  let submitted;
  try{
    await client.query('BEGIN');
    submitted=await submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,pairId:attacker.id,winnerPairId:defender.id,resultType:'normal',
      playedAt:validPlayed,score:{sets:[{pairA:6,pairB:4},{pairA:6,pairB:4}]},
    });
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal(submitted.status,'result_pending');
  const reopened=(await pool.query('SELECT status,cancelled_at,first_result_at FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0];
  assert.equal(reopened.status,'result_pending');
  assert.ok(reopened.cancelled_at);
  assert.ok(reopened.first_result_at);

  const invalidPlayed=new Date(new Date(assignment.cancelled_at).getTime()+10*60*1000);
  const client2=await pool.connect();
  try{
    await client2.query('BEGIN');
    await assert.rejects(submitWheelV3ResultVersion(client2,{
      assignmentId:assignment.id,pairId:attacker.id,winnerPairId:defender.id,resultType:'normal',
      playedAt:invalidPlayed,score:{sets:[{pairA:6,pairB:4},{pairA:6,pairB:4}]},
    }));
    await client2.query('ROLLBACK');
  }finally{client2.release();}
});

test('normal result rejects winner inconsistent with score',async()=>{
  const c=await category(5);
  const a=await seedPairWithMembers(1,5,{tag:94});
  const b=await seedPairWithMembers(2,5,{tag:95});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,assigned_at,deadline_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '1 minute',CURRENT_TIMESTAMP+interval '30 days') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  const played=(await pool.query('SELECT CURRENT_TIMESTAMP t')).rows[0].t;
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assert.rejects(submitWheelV3ResultVersion(client,{
      assignmentId:assignment.id,pairId:a.id,winnerPairId:b.id,resultType:'normal',
      playedAt:played,score:{sets:[{pairA:6,pairB:2},{pairA:6,pairB:2}]},
    }));
    await client.query('ROLLBACK');
  }finally{client.release();}
});


test('pending no-show blocks generic 30-day both-failure expiry',async()=>{
  const c=await category(6);
  const a=await seedPairWithMembers(1,6,{tag:96});
  const b=await seedPairWithMembers(2,6,{tag:97});
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,attacker_pair_id,defender_pair_id,assigned_at,deadline_at,scheduled_at,location_text,schedule_confirmed_at) VALUES($1,$2,$3,$4,$4,$3,CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP-interval '1 hour',CURRENT_TIMESTAMP-interval '2 hours','Cancha',CURRENT_TIMESTAMP-interval '3 hours') RETURNING id",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  await pool.query('INSERT INTO wheel_assignment_participants(assignment_id,pair_id) VALUES($1,$2),($1,$3)',[assignment.id,a.id,b.id]);
  await pool.query(
    "INSERT INTO wheel_no_shows(assignment_id,reported_by_pair_id,reported_pair_id,status,response_deadline_at) VALUES($1,$2,$3,'pending',CURRENT_TIMESTAMP+interval '24 hours')",
    [assignment.id,a.id,b.id],
  );

  const client=await pool.connect();
  let expired;
  try{
    await client.query('BEGIN');
    expired=await expireDueWheelV3Assignments(client);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal(expired.length,0);
  assert.equal((await pool.query('SELECT status FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].status,'open');
});

test('expired schedule proposal closes only the proposal and never resets assignment deadline',async()=>{
  const c=await category(2);
  const a=await seedPair(1,2);
  const b=await seedPair(2,2);
  const assignment=(await pool.query(
    "INSERT INTO wheel_assignments(league_id,category_id,pair_a_id,pair_b_id,assigned_at,deadline_at) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP-interval '5 days',CURRENT_TIMESTAMP+interval '25 days') RETURNING id,deadline_at",
    [a.league_id,c.id,a.id,b.id],
  )).rows[0];
  const proposal=(await pool.query(
    "INSERT INTO wheel_schedule_proposals(assignment_id,proposed_by_pair_id,scheduled_at,location_text,response_deadline_at) VALUES($1,$2,CURRENT_TIMESTAMP+interval '1 day','Cancha',CURRENT_TIMESTAMP-interval '1 second') RETURNING id",
    [assignment.id,a.id],
  )).rows[0];

  const client=await pool.connect();
  let expired;
  try{
    await client.query('BEGIN');
    expired=await expireWheelV3ScheduleProposals(client);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  assert.equal(expired.some(x=>Number(x.id)===Number(proposal.id)),true);
  const deadline=(await pool.query('SELECT deadline_at FROM wheel_assignments WHERE id=$1',[assignment.id])).rows[0].deadline_at;
  assert.equal(new Date(deadline).getTime(),new Date(assignment.deadline_at).getTime());
});
