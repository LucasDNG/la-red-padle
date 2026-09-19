import React,{useEffect,useMemo,useState}from"react";
import{Routes,Route,Link,useNavigate}from"react-router-dom";
import{api}from"./api.js";

const setSession=d=>{localStorage.setItem("token",d.token);localStorage.setItem("user",JSON.stringify(d.user));};
const getUser=()=>{try{return JSON.parse(localStorage.getItem("user"))}catch{return null}};

function Shell({children}){
  const u=getUser();
  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand" aria-label="LA RED Pádel San Pedro">
        <span className="brand-mark"><i></i><i></i><i></i></span>
        <span>LA RED <b>Pádel</b><small>San Pedro</small></span>
      </Link>
      <nav>
        <Link to="/ranking">Ranking</Link>
        {u&&<Link to="/liga">Mi liga</Link>}
        <Link to="/instalar">Instalar</Link>
        {!u&&<Link className="nav-login" to="/login">Ingresar</Link>}
      </nav>
    </header>
    <main>{children}</main>
  </div>
}

function CourtVisual(){
  return <div className="court-scene" aria-hidden="true">
    <div className="court-glow"></div>
    <div className="glass-wall">
      <div className="wall-brand">LA RED <strong>PÁDEL</strong><small>SAN PEDRO</small></div>
    </div>
    <div className="court-floor">
      <span className="line line-left"></span>
      <span className="line line-right"></span>
      <span className="line line-center"></span>
    </div>
    <div className="net">
      <span className="net-top"></span>
      <span className="net-grid"></span>
      <span className="post post-left"></span>
      <span className="post post-right"></span>
    </div>
    <div className="ball"></div>
  </div>
}

function Home(){
  return <Shell>
    <section className="hero">
      <CourtVisual/>
      <div className="hero-shade"></div>
      <div className="hero-content">
        <span className="eyebrow">LA RED · PÁDEL SAN PEDRO</span>
        <h1>Tu lugar.<br/><em>Tu categoría.</em><br/>Tu desafío.</h1>
        <p>Una liga de pádel hecha para competir todo el año. Formá tu pareja, subí posiciones y ganate tu lugar en la cancha.</p>
        <div className="actions">
          <Link className="btn primary" to="/login">Entrar a la liga</Link>
          <Link className="btn glass" to="/ranking">Ver ranking</Link>
        </div>
      </div>
      <div className="hero-badge"><span>7</span><small>CATEGORÍAS</small></div>
    </section>

    <section className="league-strip">
      <article><span className="strip-number">01</span><div><b>1ª — 3ª</b><small>Hasta 10 parejas</small></div></article>
      <article><span className="strip-number">02</span><div><b>4ª — 6ª</b><small>Hasta 30 parejas</small></div></article>
      <article><span className="strip-number">03</span><div><b>7ª</b><small>Ingreso abierto</small></div></article>
      <article><span className="strip-number">30</span><div><b>Días</b><small>Para jugar cada desafío</small></div></article>
    </section>

    <section className="home-info">
      <div>
        <span className="section-kicker">COMPETENCIA CONTINUA</span>
        <h2>La cancha ordena<br/>el ranking.</h2>
      </div>
      <div className="rules-grid">
        <article><span>↗</span><h3>Subí de categoría</h3><p>El líder que gana tres partidos consecutivos intercambia lugar con la última pareja de la categoría superior.</p></article>
        <article><span>◎</span><h3>Desafiá y jugá</h3><p>Cada desafío aceptado tiene su propio plazo de 30 días. Podés tener varios desafíos activos al mismo tiempo.</p></article>
        <article><span>≋</span><h3>Ranking claro</h3><p>Tu posición dentro de la categoría es la referencia principal. El ELO acompaña como estadística competitiva.</p></article>
      </div>
    </section>
  </Shell>
}

function Login(){
  const nav=useNavigate();
  const[mode,setMode]=useState("login");
  const[f,setF]=useState({gender:"male"});
  const[msg,setMsg]=useState("");
  async function go(e){
    e.preventDefault();
    try{
      const url=mode==="login"?"/auth/login":"/auth/register";
      const{data}=await api.post(url,f);
      setSession(data);
      nav("/liga");
    }catch(e){setMsg(e.response?.data?.error||"Error")}
  }
  return <Shell><div className="page-wrap auth-wrap">
    <div className="panel auth-panel">
      <span className="section-kicker">{mode==="login"?"BIENVENIDO DE NUEVO":"SUMATE A LA RED"}</span>
      <h2>{mode==="login"?"Ingresar":"Crear cuenta"}</h2>
      {mode==="register"&&<div className="form-grid">
        <input placeholder="Nombre" onChange={e=>setF({...f,firstName:e.target.value})}/>
        <input placeholder="Apellido" onChange={e=>setF({...f,lastName:e.target.value})}/>
        <input placeholder="WhatsApp" onChange={e=>setF({...f,phone:e.target.value})}/>
        <select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option value="male">Masculino</option><option value="female">Femenino</option></select>
      </div>}
      <form onSubmit={go}>
        <input type="email" placeholder="Email" onChange={e=>setF({...f,email:e.target.value})}/>
        <input type="password" placeholder="Contraseña" onChange={e=>setF({...f,password:e.target.value})}/>
        <button className="btn primary full">Continuar</button>
      </form>
      {msg&&<p className="error">{msg}</p>}
      <button className="linkbtn" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"Crear una cuenta":"Ya tengo cuenta"}</button>
    </div>
  </div></Shell>
}

function Ranking(){
  const[rows,setRows]=useState([]);
  useEffect(()=>{api.get("/ranking").then(r=>setRows(r.data)).catch(()=>setRows([]))},[]);
  const groups=useMemo(()=>Object.groupBy?Object.groupBy(rows,r=>`${r.slug}-${r.number}`):rows.reduce((a,r)=>((a[`${r.slug}-${r.number}`]??=[]).push(r),a),{}),[rows]);
  return <Shell><div className="page-wrap">
    <div className="page-heading"><span className="section-kicker">POSICIONES</span><h2>Ranking por categorías</h2><p>La posición manda. El ELO acompaña tu rendimiento.</p></div>
    <div className="ranking-layout">
      {!rows.length&&<div className="empty-state">Todavía no hay parejas en el ranking.</div>}
      {Object.entries(groups).map(([k,v])=><section className="category" key={k}>
        <div className="category-head"><span>{v[0].slug==="masculino"?"Masculino":"Femenino"}</span><strong>{v[0].name}</strong></div>
        {v.map(r=><div className="rank" key={r.pair_id}><b>#{r.position}</b><span>{r.players}</span><em>{r.elo} ELO</em></div>)}
      </section>)}
    </div>
  </div></Shell>
}

function League(){
  const[u]=useState(getUser());
  const[players,setPlayers]=useState([]),[inbox,setInbox]=useState([]),[msg,setMsg]=useState("");
  const[partner,setPartner]=useState(""),[cat,setCat]=useState(7);
  async function load(){
    try{
      const[a,b]=await Promise.all([api.get("/players"),api.get("/challenges/inbox")]);
      setPlayers(a.data);setInbox(b.data);
    }catch(e){setMsg(e.response?.data?.error||"Iniciá sesión")}
  }
  useEffect(()=>{load()},[]);
  async function makePair(){
    try{await api.post("/pairs",{partnerId:Number(partner),category:Number(cat)});setMsg("Pareja creada. Entraron últimos en la categoría.");}
    catch(e){setMsg(e.response?.data?.error||"Error")}
  }
  async function accept(id){
    try{await api.patch(`/challenges/${id}/accept`);setMsg("Aceptado: tienen 30 días para jugar.");load();}
    catch(e){setMsg(e.response?.data?.error||"Error")}
  }
  return <Shell><div className="page-wrap">
    <div className="page-heading"><span className="section-kicker">MI COMPETENCIA</span><h2>Mi liga</h2><p>Hola, {u?.first_name}. Gestioná tu pareja y tus desafíos.</p></div>
    <div className="grid2">
      <section className="panel"><span className="panel-index">01</span><h3>Formar pareja</h3>
        <select value={partner} onChange={e=>setPartner(e.target.value)}><option value="">Elegí compañero/a</option>{players.filter(p=>p.gender===u?.gender).map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select>
        <select value={cat} onChange={e=>setCat(e.target.value)}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}ª categoría</option>)}</select>
        <button className="btn primary full" onClick={makePair}>Crear pareja</button>
      </section>
      <section className="panel"><span className="panel-index">02</span><h3>Rueda de desafíos</h3>
        {!inbox.length&&<p className="muted">No tenés desafíos pendientes.</p>}
        {inbox.map((c,i)=><div className="challenge" key={c.id}><span><small>{i===0?"DISPONIBLE AHORA":"EN ESPERA"}</small>Desafío #{c.id}</span><button disabled={i!==0} onClick={()=>accept(c.id)}>Aceptar</button></div>)}
      </section>
    </div>
    {msg&&<p className="notice">{msg}</p>}
  </div></Shell>
}

function Install(){
  const[deferred,setDeferred]=useState(null);
  useEffect(()=>{const h=e=>{e.preventDefault();setDeferred(e)};addEventListener("beforeinstallprompt",h);return()=>removeEventListener("beforeinstallprompt",h)},[]);
  return <Shell><div className="page-wrap auth-wrap"><div className="panel auth-panel">
    <span className="section-kicker">APP INSTALABLE</span><h2>LA RED en tu teléfono</h2>
    <p className="muted">En Android podés instalarla directamente. En iPhone: Safari → Compartir → Agregar a pantalla de inicio.</p>
    {deferred&&<button className="btn primary full" onClick={()=>deferred.prompt()}>Instalar ahora</button>}
  </div></div></Shell>
}

export default function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/ranking" element={<Ranking/>}/><Route path="/liga" element={<League/>}/><Route path="/instalar" element={<Install/>}/></Routes>}
