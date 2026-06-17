import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, updateDoc,
  serverTimestamp, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ============================================================
   1. FIREBASE CONFIG  —  ⚠️ cola aqui os teus valores
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyA1x2zxsjQ3TY1ALsGjbVBdSo-FXUR6ZfM",
  authDomain: "madeira-viagem.firebaseapp.com",
  databaseURL: "https://madeira-viagem-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "madeira-viagem",
  storageBucket: "madeira-viagem.firebasestorage.app",
  messagingSenderId: "431424806116",
  appId: "1:431424806116:web:6bd98958982ff052d320f1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const TRIP_ID = "madeira2026";

/* ============================================================
   2. UTILIZADORES
============================================================ */
const USERS = {
  rui:  { name:"Rui",  initial:"R", color:"oklch(0.55 0.20 295)" },
  rita: { name:"Rita", initial:"R", color:"oklch(0.62 0.11 184)" },
};
const TYPES = ["passeio","praia","miradouro","levada","comida","experiência","histórico","natureza","noite","base","voo"];

const toMin = (t)=>{ if(!t) return 99999; const m=/^(\d{1,2}):(\d{2})$/.exec(t.trim());
  return m? (+m[1])*60+(+m[2]) : 99999; };
const sortByTime = (s)=> [...s].sort((a,b)=>toMin(a.time)-toMin(b.time));

const wikiTitle = (name)=>{ let n=name.replace(/\s*\(.*?\)\s*/g,'').replace(/\s*[—–-]\s*.*/,'').trim();
  n=n.replace(/^(Almoço|Jantar|Check-in|Voo)\s*/i,'').trim();
  return encodeURIComponent(n.replace(/\s+/g,'_')); };
const mapsUrl = (q)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+' Madeira')}`;
const wazeUrl = (q)=>`https://waze.com/ul?q=${encodeURIComponent(q+' Madeira')}`;

/* ============================================================
   3. SEED
============================================================ */
const SEED_DAYS = [
  { id:"d1", date:"18 Jun", label:"Quinta", title:"Chegada + Funchal", stops:[
    {id:"s_v1", name:"Voo Lisboa → Funchal", type:"voo", time:"06:30", pet:true, desc:"Chegada 08:20. Troy viaja convosco.", flight:true},
    {id:"s1", name:"Check-in São Martinho", type:"base", time:"09:30", pet:true, desc:"Largar malas na base, zona oeste do Funchal."},
    {id:"s2", name:"Rua de Santa Maria", type:"passeio", time:"10:30", pet:true, desc:"Rua histórica com as portas pintadas."},
    {id:"s3", name:"Mercado dos Lavradores", type:"experiência", time:"11:15", pet:false, desc:"Mercado icónico de fruta, flores e peixe."},
    {id:"s4", name:"Praça do Município", type:"passeio", time:"12:00", pet:true, desc:"Praça em calçada portuguesa."},
    {id:"s5", name:"Almoço — Av. Arriaga", type:"comida", time:"12:45", pet:true, desc:"Esplanadas sob as jacarandás."},
    {id:"s6", name:"Parque de Santa Catarina", type:"natureza", time:"14:00", pet:true, desc:"Jardim com vista sobre a baía."},
    {id:"s7", name:"Teleférico do Funchal", type:"experiência", time:"15:00", pet:false, desc:"Subida ao Monte com vista sobre a cidade."},
    {id:"s8", name:"Igreja de Nossa Senhora do Monte", type:"histórico", time:"15:30", pet:true, desc:"Igreja no topo do Monte."},
    {id:"s9", name:"Carros de Cesto do Monte", type:"experiência", time:"16:30", pet:false, desc:"Descida tradicional em cestos de verga."},
    {id:"s10", name:"Praia do Lido", type:"praia", time:"17:30", pet:false, desc:"Complexo balnear no oeste do Funchal."},
    {id:"s11", name:"Jantar", type:"comida", time:"20:00", pet:true, desc:"Primeira noite — espetada e poncha."},
    {id:"s12", name:"Casino da Madeira", type:"noite", time:"22:00", pet:false, desc:"Edifício de Óscar Niemeyer."},
  ]},
  { id:"d2", date:"19 Jun", label:"Sexta", title:"Norte, Este e Sul", stops:[
    {id:"d2s1", name:"Casas Típicas de Santana", type:"passeio", time:"10:00", pet:true, desc:"As casinhas triangulares de colmo."},
    {id:"d2s2", name:"Parque das Queimadas", type:"natureza", time:"10:45", pet:true, desc:"Floresta laurissilva com casas de colmo."},
    {id:"d2s3", name:"Miradouro do Guindaste", type:"miradouro", time:"11:45", pet:true, desc:"Plataforma de vidro sobre o mar."},
    {id:"d2s4", name:"Porto da Cruz", type:"passeio", time:"12:15", pet:true, desc:"Vila costeira com o Penedo da Águia."},
    {id:"d2s5", name:"Ponta de São Lourenço", type:"miradouro", time:"13:00", pet:true, desc:"Ponta leste vulcânica."},
    {id:"d2s6", name:"Almoço — Talho do Caniço", type:"comida", time:"14:00", pet:false, desc:"Carne na brasa no Caniço."},
    {id:"d2s7", name:"Miradouro do Cristo Rei", type:"miradouro", time:"15:30", pet:true, desc:"Estátua e vista sobre a baía do Caniço."},
    {id:"d2s8", name:"Praia dos Reis Magos", type:"praia", time:"16:30", pet:false, desc:"Praia de calhau com piscina natural."},
  ]},
  { id:"d3", date:"20 Jun", label:"Sábado", title:"Costa Noroeste", stops:[
    {id:"d3s1", name:"Capela de São Vicente", type:"histórico", time:"10:30", pet:true, desc:"Capela do séc. XVII escavada na rocha."},
    {id:"d3s2", name:"Grutas de São Vicente", type:"experiência", time:"11:00", pet:false, desc:"Tour por tubos de lava + filme 3D."},
    {id:"d3s3", name:"Véu da Noiva", type:"miradouro", time:"12:30", pet:true, desc:"Cascata sobre a falésia."},
    {id:"d3s4", name:"Praia do Seixal", type:"praia", time:"13:15", pet:false, desc:"Areia preta vulcânica com cascata."},
    {id:"d3s5", name:"Piscinas Naturais do Seixal", type:"praia", time:"15:00", pet:false, desc:"Piscinas de rocha vulcânica."},
    {id:"d3s6", name:"Ribeira da Janela", type:"miradouro", time:"16:00", pet:true, desc:"Rochedos icónicos no mar."},
    {id:"d3s7", name:"Piscinas Naturais do Porto Moniz", type:"praia", time:"16:45", pet:false, desc:"As famosas piscinas vulcânicas."},
  ]},
  { id:"d4", date:"21 Jun", label:"Domingo", title:"Por definir", stops:[] },
  { id:"d5", date:"22 Jun", label:"Segunda", title:"Último dia e Voo", stops:[
    {id:"d5_v", name:"Voo Funchal → Lisboa", type:"voo", time:"21:55", pet:true, desc:"Chegada 23:40. Aeroporto por volta das 20:00.", flight:true},
  ]},
];

const SEED_FOODS = [
  {id:"f1",name:"Poncha Regional",cat:"bebida"},{id:"f2",name:"Poncha Maracujá",cat:"bebida"},
  {id:"f3",name:"Poncha Pescadores",cat:"bebida"},{id:"f4",name:"Poncha Morango",cat:"bebida"},
  {id:"f5",name:"Poncha Tangerina",cat:"bebida"},{id:"f6",name:"Poncha Limão",cat:"bebida",novo:true},
  {id:"f7",name:"Espetada em Pau de Loureiro",cat:"prato"},{id:"f8",name:"Espada com Banana",cat:"prato"},
  {id:"f9",name:"Filete de Espada",cat:"prato"},{id:"f10",name:"Bife de Atum",cat:"prato"},
  {id:"f11",name:"Picado",cat:"prato"},{id:"f12",name:"Lapas",cat:"prato"},
  {id:"f13",name:"Cracas",cat:"prato"},{id:"f14",name:"Castanhetas",cat:"prato"},
  {id:"f15",name:"Sopa de Tripa",cat:"prato"},{id:"f16",name:"Sopa de Tomate",cat:"prato"},
  {id:"f17",name:"Milho Frito",cat:"prato"},{id:"f18",name:"Prego no Bolo do Caco",cat:"prato"},
  {id:"f19",name:"Bolo do Caco",cat:"prato"},{id:"f20",name:"Gaiado",cat:"prato",novo:true},
  {id:"f21",name:"Carne de Vinho e Alhos",cat:"prato",novo:true},
  {id:"f22",name:"Pudim de Maracujá",cat:"doce"},{id:"f23",name:"Bolo de Mel",cat:"doce",novo:true},
  {id:"f24",name:"Broas de Mel",cat:"doce",novo:true},{id:"f25",name:"Queijadas",cat:"doce",novo:true},
  {id:"f26",name:"Anona",cat:"doce",novo:true},
  {id:"f27",name:"Brisa Maracujá",cat:"bebida"},{id:"f28",name:"Laranjada",cat:"bebida"},
  {id:"f29",name:"Coral",cat:"bebida"},{id:"f30",name:"Nikita",cat:"bebida"},
  {id:"f31",name:"Pé de Cabra",cat:"bebida"},{id:"f32",name:"Sidra da Madeira",cat:"bebida"},
  {id:"f33",name:"Tim Tam Tum",cat:"bebida"},{id:"f34",name:"Licor de Tangerina",cat:"bebida"},
  {id:"f35",name:"Vinho da Madeira",cat:"bebida"},{id:"f36",name:"Aguardente de Cana",cat:"bebida",novo:true},
];

/* Rota da Poncha — bares com coordenadas/zona/rating reais (Google Places).
   Os que ainda não têm lat/lng geocodificam no browser (Nominatim) na 1ª vez. */
const BAR_DATA = [
  {n:"Bar Castrinhos",z:"Funchal",lat:32.6571147,lng:-16.9548985,r:4.6},
  {n:"The Small House",z:"Funchal"},
  {n:"Tasquinha do Brazão",z:"Funchal",lat:32.6551803,lng:-16.9250495,r:4.1},
  {n:"A Casa da Levada",z:"Funchal",lat:32.6437646,lng:-16.9441422,r:4.5},
  {n:"Bar Nº 2 (É Prá Poncha)",z:"Câmara de Lobos",lat:32.6484709,lng:-16.9751921,r:4.4},
  {n:"Cafetaria Sete Mares",z:"Funchal",lat:32.6435589,lng:-16.9146699,r:4.4},
  {n:"Taberna da Poncha",z:"Serra de Água",lat:32.7164928,lng:-17.0331137,r:4.7},
  {n:"Taberna da Serra",z:"Serra de Água",lat:32.7204051,lng:-17.031064,r:4.5},
  {n:"Poncha do Lombo Doutor",z:"Ponta do Pargo",lat:32.7262577,lng:-17.1670633,r:4.7},
  {n:"Bar Formiga",z:"Fajã da Ovelha",lat:32.7767849,lng:-17.2230625,r:4.7},
  {n:"Bar Do Papagaio",z:"Fajã da Ovelha",lat:32.7694235,lng:-17.2152989,r:4.7},
  {n:"Porto de Abrigo",z:"Funchal"},
  {n:"Restaurante Ponte Velha",z:"Faial",lat:32.7864295,lng:-16.8528054,r:4.1},
  {n:"Venda do Noé",z:"Caniço",lat:32.655953,lng:-16.8276074,r:4.7},
  {n:"Snack-bar O Girinho",z:"Camacha",lat:32.6762843,lng:-16.8517063,r:4.4},
  {n:"Forest - Food & Coffee",z:"Funchal"},
  {n:"Poncha De São Vicente",z:"São Vicente",lat:32.8029077,lng:-17.0433405,r:4.5},
  {n:"Venda do Sócio",z:"Funchal"},
  {n:"Adega do Pomar",z:"Camacha",lat:32.6766079,lng:-16.851523,r:4.5},
  {n:"Bar Morenos",z:"Câmara de Lobos"},
  {n:"Portas Vermelhas",z:"Camacha",lat:32.6941202,lng:-16.837146,r:4.6},
  {n:"Tasquinha da Poncha",z:"Serra de Água",lat:32.7265304,lng:-17.0285239,r:4.6},
  {n:"Bar À Quinta",z:"Quinta Grande",lat:32.6625704,lng:-17.011387,r:4.6},
  {n:"The Chupa",z:"Machico",lat:32.728756,lng:-16.775123,r:4.5},
  {n:"Bar Salomão",z:"Camacha",lat:32.6762981,lng:-16.8519399,r:5.0},
  {n:"Poncha da Imperatriz",z:"Funchal",lat:32.6432365,lng:-16.9195864,r:4.6},
  {n:"Salão de Bilhares - Bilha Café",z:"Funchal"},
  {n:"Snack Bar Vermelho",z:"Camacha",lat:32.6707637,lng:-16.8558774,r:4.4},
  {n:"Tasquinha Janota",z:"Funchal"},{n:"Tasca da Teicy",z:"Funchal"},
  {n:"Taberna e Mercearia Canto do Passo",z:"Funchal"},{n:"Torneira Bar",z:"Funchal"},
  {n:"Bar Roque",z:"Funchal"},{n:"Chega de Securas",z:"Funchal"},{n:"Bar O Vizinho",z:"Funchal"},
  {n:"Restaurante Viola",z:"Funchal"},{n:"A Ferradura",z:"Santana"},{n:"Tahiti",z:"Funchal"},
  {n:"Peter's Poncha",z:"Funchal"},{n:"Rum Bar",z:"Funchal"},{n:"Taberna Boa Hora",z:"Funchal"},
  {n:"Pharmacia Do Bento",z:"Funchal"},{n:"Taberna Dos Barreiros",z:"Funchal"},
  {n:"Barmen Madeira Bar",z:"Funchal"},{n:"The Prince Albert Pub & Food",z:"Funchal"},
  {n:"A Venda Do André",z:"Funchal"},{n:"Pharmacia do Vasco",z:"Funchal"},{n:"As Patinhas",z:"Funchal"},
  {n:"Venda do Jacintinho",z:"Funchal"},{n:"Bar Careca",z:"Campanário",lat:32.6694693,lng:-17.044602,r:4.5},
  {n:"Bota Abaixo Boteco",z:"Funchal"},{n:"Restaurant Bar a Pinheira",z:"Funchal"},
  {n:"Taberna Dos Lobos",z:"Câmara de Lobos"},{n:"Casa do Farol",z:"Funchal"},{n:"Sunny Bar",z:"Funchal"},
  {n:"Tasca do Barbas",z:"Câmara de Lobos"},{n:"Venda do Rato",z:"Funchal"},
  {n:"Tasquinha do Henrique",z:"Funchal"},{n:"Tasca Da Laurinda",z:"Funchal"},
  {n:"Taberna do Petisco",z:"Funchal"},{n:"Grutas do Faial",z:"Faial"},
  {n:"Poncha do Pescador",z:"Funchal"},{n:"Restaurante Sol Poente",z:"Funchal"},
  {n:"Abrigo do Pastor",z:"Camacha"},{n:"Bar Cedro",z:"Funchal"},{n:"Ramiro's",z:"Funchal"},
  {n:"Café Restaurante Gruta",z:"Funchal"},{n:"Inverse CR7 Sports Bar",z:"Funchal"},
  {n:"Restaurante O Moinho",z:"Funchal"},{n:"Restaurante Bar Horizonte",z:"Funchal"},
  {n:"Bar O Moega",z:"Funchal"},{n:"Bar Riacho",z:"Machico"},{n:"Mercearia Dona Mécia",z:"Funchal"},
  {n:"João Rodrigues de Jesus",z:"Funchal"},{n:"Multi Delícias",z:"Funchal"},
  {n:"Tasquinha O Salsa",z:"Funchal"},{n:"Bar N. Castelo",z:"Funchal"},{n:"Snack Bar Bolero",z:"Funchal"},
  {n:"Bar da Graça",z:"Funchal"},{n:"Snack Bar Flor da Selva",z:"Funchal"},{n:"Tasca Da Mexida",z:"Funchal"},
  {n:"John's Poncha",z:"Funchal"},{n:"Snack Bar São João",z:"Funchal"},{n:"Snack-Bar AC",z:"Funchal"},
  {n:"Cantinho do Petisco",z:"Monte",lat:32.6659529,lng:-16.9088693,r:4.7},
  {n:"Pipa Santa Clara",z:"Funchal"},{n:"Taverna Real da Poncha",z:"Funchal"},
  {n:"Taberna Evaristo",z:"Funchal"},{n:"Banana's Pub",z:"Funchal"},{n:"101 Bar",z:"Funchal"},
  {n:"Poncha do Calvário",z:"Funchal"},{n:"Bar Seven Seas",z:"Funchal"},
  {n:"Restaurante Beer Garden",z:"Funchal"},{n:"Restaurante Miradouro",z:"Funchal"},
  {n:"Bar Zeca",z:"São Roque do Faial",lat:32.7532398,lng:-16.8725128,r:4.7},
  {n:"Restaurante Convento Das Vinhas",z:"Funchal"},{n:"Snack Bar O Foles",z:"Funchal"},
];
const SEED_BARS = BAR_DATA.map((b,i)=>({
  id:"b"+i, name:b.n, zona:b.z||null, lat:b.lat??null, lng:b.lng??null, gRating:b.r??null
}));

/* ============================================================
   4. APP
============================================================ */
const { useState, useEffect, useRef } = React;
const h = React.createElement;

const Icon = ({d,size=24,fill='none'})=>h('svg',{viewBox:'0 0 24 24',width:size,height:size,
  fill,stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'},
  Array.isArray(d)?d.map((p,i)=>h('path',{key:i,d:p})):h('path',{d}));
const ICONS={
  check:'M5 13l4 4L19 7', plus:'M12 5v14M5 12h14',
  plane:'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L12 19v-5.5z',
  pin:['M12 21s-7-5.6-7-11a7 7 0 1114 0c0 5.4-7 11-7 11z','M12 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'],
  nav:'M3 11l19-9-9 19-2-8-8-2z',
  heart:'M12 21s-7.5-4.6-10-9.5C.5 8 2 4.5 5.5 4.5c2 0 3.4 1.2 4.5 2.5 1.1-1.3 2.5-2.5 4.5-2.5C18 4.5 19.5 8 18 11.5 15.5 16.4 12 21 12 21z',
  comment:'M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z',
  send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  trash:['M3 6h18','M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2','M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6'],
  edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  camera:['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z','M12 17a4 4 0 100-8 4 4 0 000 8z'],
  image:['M3 5h18v14H3z','M3 15l5-5 4 4 4-4 5 5'],
  list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  cup:'M6 3v7a2 2 0 104 0V3M8 10v11M17 3c-1.5 1.5-2 3.5-2 6s2 3 2 3v9',
  glass:['M5 3h14l-1.5 9a4 4 0 01-4 3.2h-3A4 4 0 016.5 12L5 3z','M12 15.2V21','M8 21h8'],
  play:['M3 5h18v14H3z','M10 9l5 3-5 3z'],
};

function compress(file, max=1500, q=0.76){
  return new Promise(res=>{ const img=new Image(),rd=new FileReader();
    rd.onload=e=>img.src=e.target.result;
    img.onload=()=>{ let w=img.width,ht=img.height;
      if(w>ht&&w>max){ht=ht*max/w;w=max}else if(ht>max){w=w*max/ht;ht=max}
      const c=document.createElement('canvas');c.width=w;c.height=ht;
      c.getContext('2d').drawImage(img,0,0,w,ht);c.toBlob(b=>res(b),'image/jpeg',q); };
    rd.readAsDataURL(file); });
}

function App(){
  const [uid,setUid]=useState(null);
  const [me,setMe]=useState(localStorage.getItem('madeira_me')||null);
  const [tab,setTab]=useState('plano');
  const [days,setDays]=useState(null);
  const [foods,setFoods]=useState(null);
  const [bars,setBars]=useState(null);
  const [posts,setPosts]=useState([]);
  const [toast,setToast]=useState('');
  const [lightbox,setLightbox]=useState(null);
  const scrollRef=useRef(null);
  const tT=useRef();
  const flash=(m)=>{setToast(m);clearTimeout(tT.current);tT.current=setTimeout(()=>setToast(''),1700)};

  useEffect(()=>{ signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth,u=>{if(u)setUid(u.uid)}); },[]);

  useEffect(()=>{ if(!uid)return;
    const ref=doc(db,'trips',TRIP_ID);
    getDoc(ref).then(s=>{if(!s.exists())
      setDoc(ref,{days:SEED_DAYS,foods:SEED_FOODS,bars:SEED_BARS,createdAt:serverTimestamp()})});
    const u1=onSnapshot(ref,s=>{if(s.exists()){const dt=s.data();
      setDays(dt.days||[]);setFoods(dt.foods||[]);
      // migração: se os bares guardados não têm 'zona', re-semear preservando votos
      let savedBars=dt.bars&&dt.bars.length?dt.bars:SEED_BARS;
      if(savedBars[0] && savedBars[0].zona===undefined){
        const voteMap={}; savedBars.forEach(b=>{if(b.votes)voteMap[b.name]=b.votes;});
        savedBars=SEED_BARS.map(b=>voteMap[b.name]?{...b,votes:voteMap[b.name]}:b);
        updateDoc(ref,{bars:savedBars}).catch(()=>{});
      }
      setBars(savedBars)}});
    const u2=onSnapshot(query(collection(db,'trips',TRIP_ID,'posts'),orderBy('ts','desc')),
      s=>setPosts(s.docs.map(d=>({id:d.id,...d.data()}))));
    return ()=>{u1();u2()};
  },[uid]);

  const changeTab=(t)=>{ setTab(t); if(scrollRef.current)scrollRef.current.scrollTop=0; window.scrollTo(0,0); };

  if(!uid||days===null||foods===null||bars===null) return h('div',{className:'load'},h('div',{className:'spin'}));
  if(!me) return h(PickUser,{onPick:k=>{localStorage.setItem('madeira_me',k);setMe(k)}});

  const meU=USERS[me];
  const save=(patch)=>updateDoc(doc(db,'trips',TRIP_ID),patch);

  return h('div',null,
    h('div',{className:'app-scroll',ref:scrollRef},
      h(Header,{me:meU,tab}),
      h(InstallBanner),
      tab==='plano'&&h(Plano,{days,me,save,flash,openLightbox:setLightbox}),
      tab==='feed'&&h(Feed,{posts,me,meU,flash}),
      tab==='comida'&&h(Comida,{foods,me,save}),
      tab==='poncha'&&h(Poncha,{bars,me,save,flash}),
      tab==='video'&&h(Video,{days,posts})),
    h(TabBar,{tab,setTab:changeTab}),
    toast&&h('div',{className:'toast'},toast),
    lightbox&&h(Lightbox,{data:lightbox,me,save,days,onClose:()=>setLightbox(null),flash})
  );
}

function InstallBanner(){
  const [show,setShow]=useState(false),[evt,setEvt]=useState(null),[ios,setIos]=useState(false);
  useEffect(()=>{ if(localStorage.getItem('madeira_inst')||
    window.matchMedia('(display-mode: standalone)').matches) return;
    if(/iphone|ipad|ipod/i.test(navigator.userAgent)){setIos(true);setShow(true);return;}
    const hr=(e)=>{e.preventDefault();setEvt(e);setShow(true)};
    window.addEventListener('beforeinstallprompt',hr);
    return ()=>window.removeEventListener('beforeinstallprompt',hr);
  },[]);
  if(!show)return null;
  const inst=async()=>{if(evt){evt.prompt();const r=await evt.userChoice;
    if(r.outcome==='accepted'){localStorage.setItem('madeira_inst','1');setShow(false)}}};
  return h('div',{className:'banner'},
    h('div',{style:{color:'var(--brand-d)'}},h(Icon,{d:ICONS.plus,size:22})),
    h('div',{className:'t'}, ios?'Instalar: toca em Partilhar → "Adicionar ao ecrã principal".'
      :'Instala a app no telemóvel para acesso rápido.'),
    !ios&&h('button',{className:'btn sm',onClick:inst},'Instalar'),
    h('button',{className:'x',onClick:()=>{setShow(false);localStorage.setItem('madeira_inst','1')}},'×')
  );
}

function PickUser({onPick}){
  return h('div',{className:'scr',style:{paddingTop:'22vh'}},
    h('div',{className:'center muted',style:{fontWeight:600,fontSize:13,letterSpacing:'.04em'}},
      '18 – 22 JUNHO 2026'),
    h('h1',{className:'display center',style:{fontSize:48,fontWeight:700,margin:'8px 0 4px'}},'Madeira'),
    h('p',{className:'center muted',style:{marginBottom:40,fontSize:14.5}},'Rui e Rita · com o Troy'),
    Object.entries(USERS).map(([k,u])=>
      h('button',{key:k,className:'btn',style:{background:u.color,marginBottom:11,
        display:'flex',alignItems:'center',justifyContent:'center',gap:12,
        boxShadow:'0 2px 14px '+u.color.replace(')',' / .3)')},onClick:()=>onPick(k)},
        h('span',{style:{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.25)',
          display:'grid',placeItems:'center',fontSize:13,fontWeight:800}},u.initial),u.name))
  );
}

function Header({me,tab}){
  const T={plano:['Itinerário','5 dias na ilha'],feed:['Diário','os vossos momentos'],
    comida:['Sabores','prova e avalia'],poncha:['Rota da Poncha','conquista os bares'],
    video:['Montagem','a viagem em fotos']};
  const [t,s]=T[tab];
  return h('div',{className:'head'},
    h('div',null,h('h1',{className:'display'},t),h('div',{className:'sub'},s)),
    h('div',{className:'avatar',style:{background:me.color}},me.initial)
  );
}

/* ---------- PLANO ---------- */
function Plano({days,me,save,flash,openLightbox}){
  const [open,setOpen]=useState(days[0]?.id);
  const [adding,setAdding]=useState(null);
  const toggle=(di,si)=>{const nd=structuredClone(days);const s=nd[di].stops[si];
    s.done=!s.done;s.doneBy=s.done?me:null;save({days:nd})};
  const editTitle=(di)=>{const t=prompt('Título do dia:',days[di].title);
    if(t!==null){const nd=structuredClone(days);nd[di].title=t;save({days:nd})}};
  const removeStop=(di,si)=>{const s=days[di].stops[si];
    if(!confirm(`Remover "${s.name}" do dia?`))return;
    const nd=structuredClone(days);nd[di].stops.splice(si,1);save({days:nd});flash('Local removido')};
  return h('div',{className:'scr'},
    days.map((d,di)=>{
      const total=d.stops.length,done=d.stops.filter(s=>s.done).length;
      const pct=total?done/total:0,isOpen=open===d.id,C=2*Math.PI*13;
      return h('div',{key:d.id,className:'day'+(isOpen?' open':'')},
        h('div',{className:'day-hd',onClick:()=>setOpen(isOpen?null:d.id)},
          h('div',{className:'day-n'},h('div',{className:'n'},di+1),
            h('div',{className:'mo'},d.date.split(' ')[1])),
          h('div',{className:'day-meta'},h('div',{className:'dt'},d.date+' · '+d.label),
            h('div',{className:'ti'},d.title)),
          h('div',{className:'day-right'},
            total>0&&h('div',{className:'ringwrap'},
              h('svg',{width:32,height:32},
                h('circle',{cx:16,cy:16,r:13,fill:'none',stroke:'var(--hair)',strokeWidth:2.5}),
                h('circle',{cx:16,cy:16,r:13,fill:'none',stroke:'var(--brand)',strokeWidth:2.5,
                  strokeDasharray:C,strokeDashoffset:C*(1-pct),strokeLinecap:'round',
                  transform:'rotate(-90 16 16)'})),
              h('div',{className:'f'},done)),
            h('div',{className:'chev'+(isOpen?' up':'')},h(Icon,{d:'M6 9l6 6 6-6',size:20})))),
        isOpen&&h('div',{className:'day-body'},
          d.stops.length===0&&h('div',{className:'empty',style:{padding:'30px'}},
            h(Icon,{d:ICONS.pin,size:34}),h('div',null,'Dia livre. Adiciona os teus locais.')),
          d.stops.map((s,si)=>h(Stop,{key:s.id,s,di,si,days,me,save,flash,
            onToggle:()=>toggle(di,si),onRemove:()=>removeStop(di,si),openLightbox})),
          h('div',{className:'foot-actions'},
            h('button',{className:'btn soft sm',style:{flex:1},onClick:()=>setAdding(di)},'+ Adicionar local'),
            h('button',{className:'btn ghost sm',onClick:()=>editTitle(di)},'Editar título')))
      );
    }),
    adding!==null&&h(AddSheet,{di:adding,days,save,flash,onClose:()=>setAdding(null)})
  );
}

function Stop({s,di,si,days,me,save,flash,onToggle,onRemove,openLightbox}){
  const fileRef=useRef();
  const [busy,setBusy]=useState(false);
  const [exp,setExp]=useState(false);
  const [refPhoto,setRefPhoto]=useState(undefined);
  useEffect(()=>{ if(!exp||refPhoto!==undefined)return;
    if(s.flight||s.type==='base'||/^(Almoço|Jantar)/.test(s.name)){setRefPhoto(null);return;}
    fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${wikiTitle(s.name)}`)
      .then(r=>r.ok?r.json():null).then(d=>setRefPhoto(d?.thumbnail?.source||null)).catch(()=>setRefPhoto(null));
  },[exp]);
  const onFiles=async(e)=>{const files=[...e.target.files];if(!files.length)return;setBusy(true);
    try{const nd=structuredClone(days);const st=nd[di].stops[si];st.photos=st.photos||[];
      for(const f of files){const blob=await compress(f);
        const path=`trips/${TRIP_ID}/stops/${s.id}/${Date.now()}_${Math.random().toString(36).slice(2,7)}.jpg`;
        const r=sref(storage,path);await uploadBytes(r,blob);
        st.photos.push({url:await getDownloadURL(r),path,by:me,ts:Date.now(),cap:''});}
      await save({days:nd});flash('Foto adicionada');
    }catch(err){console.error(err);flash('Erro no upload')}setBusy(false);};
  return h('div',{className:'stop'},
    !s.flight&&h('div',{className:'tick'+(s.done?' on':''),onClick:onToggle},h(Icon,{d:ICONS.check,size:15})),
    s.flight&&h('div',{className:'flight-ic'},h(Icon,{d:ICONS.plane,size:24})),
    h('div',{className:s.flight?'s-main flight':'s-main'},
      h('div',{onClick:()=>!s.flight&&setExp(v=>!v),style:{cursor:s.flight?'default':'pointer'}},
        s.time&&h('div',{className:'s-time tnum'},s.time),
        h('div',{className:'s-name'+(s.done?' done':'')},s.name),
        s.desc&&h('div',{className:'s-desc'},s.desc)),
      h('div',{className:'s-tags'},
        h('span',{className:'tag type'},s.type),
        !s.flight&&(s.pet?h('span',{className:'tag pet'},'pet-friendly'):h('span',{className:'tag nopet'},'sem cães')),
        s.done&&s.doneBy&&h('span',{className:'tag by'},'✓ '+(USERS[s.doneBy]?.name||''))),
      exp&&!s.flight&&h('div',null,
        refPhoto&&h('img',{className:'ref-photo',src:refPhoto,alt:s.name}),
        h('div',{className:'ref-row'},
          h('a',{className:'link-btn',href:mapsUrl(s.name),target:'_blank',rel:'noopener'},
            h(Icon,{d:ICONS.pin,size:15}),'Maps'),
          h('a',{className:'link-btn',href:wazeUrl(s.name),target:'_blank',rel:'noopener'},
            h(Icon,{d:ICONS.nav,size:15}),'Waze'),
          h('button',{className:'link-btn',style:{color:'var(--coral)',cursor:'pointer'},
            onClick:onRemove},h(Icon,{d:ICONS.trash,size:15}),'Remover'))),
      h('div',{className:'shots'},
        (s.photos||[]).map((p,i)=>h('div',{key:i,className:'shot',onClick:()=>openLightbox({photo:p,di,si,pi:i})},
          h('img',{src:p.url}),p.cap&&h('div',{className:'bar'}))),
        h('div',{className:'add-shot',onClick:()=>fileRef.current.click()},busy?'…':h(Icon,{d:ICONS.plus,size:22})),
        h('input',{ref:fileRef,type:'file',accept:'image/*',multiple:true,capture:'environment',
          style:{display:'none'},onChange:onFiles}))
    )
  );
}

function AddSheet({di,days,save,flash,onClose}){
  const [name,setName]=useState(''),[time,setTime]=useState(''),[type,setType]=useState('passeio'),
    [desc,setDesc]=useState(''),[pet,setPet]=useState(true),[more,setMore]=useState(false);
  const add=()=>{if(!name.trim()){flash('Falta o nome');return;}
    const nd=structuredClone(days);
    nd[di].stops.push({id:'x'+Date.now(),name:name.trim(),time:time.trim(),type,desc:desc.trim(),pet});
    nd[di].stops=sortByTime(nd[di].stops);save({days:nd});flash('Local adicionado');onClose();};
  return h('div',{className:'backdrop',onClick:onClose},
    h('div',{className:'sheet',onClick:e=>e.stopPropagation()},
      h('div',{className:'grab'}),h('h3',{className:'display'},'Novo local'),
      h('p',{className:'muted',style:{marginTop:0,marginBottom:2}},'Dia '+(di+1)+' · '+days[di].date),
      h('label',{className:'fld'},'Nome'),
      h('input',{value:name,onChange:e=>setName(e.target.value),placeholder:'Ex.: Cabo Girão',autoFocus:true}),
      h('label',{className:'fld'},'Tipo'),
      h('select',{value:type,onChange:e=>setType(e.target.value)},TYPES.map(t=>h('option',{key:t,value:t},t))),
      h('label',{className:'fld'},'Aceita o Troy?'),
      h('div',{className:'toggle'},
        h('button',{className:pet?'on':'',onClick:()=>setPet(true)},'Pet-friendly'),
        h('button',{className:!pet?'on':'',onClick:()=>setPet(false)},'Sem cães')),
      !more&&h('button',{className:'btn ghost sm',style:{width:'100%',marginTop:14},
        onClick:()=>setMore(true)},'Adicionar hora e descrição'),
      more&&h('div',null,
        h('label',{className:'fld'},'Hora (entra na ordem certa)'),
        h('input',{value:time,onChange:e=>setTime(e.target.value),placeholder:'Ex.: 14:30'}),
        h('label',{className:'fld'},'Descrição'),
        h('textarea',{value:desc,onChange:e=>setDesc(e.target.value),placeholder:'Uma nota…'})),
      h('button',{className:'btn',style:{marginTop:16},onClick:add},'Adicionar ao dia'),
      h('button',{className:'btn ghost',style:{marginTop:8},onClick:onClose},'Cancelar')
    ));
}

function Lightbox({data,me,save,days,onClose,flash}){
  const {photo,di,si,pi}=data;
  const [cap,setCap]=useState(photo.cap||''),[editing,setEditing]=useState(false);
  const saveCap=()=>{const nd=structuredClone(days);nd[di].stops[si].photos[pi].cap=cap.trim();
    save({days:nd});setEditing(false);flash('Descrição guardada')};
  const del=async()=>{if(!confirm('Eliminar esta foto?'))return;
    try{if(photo.path)await deleteObject(sref(storage,photo.path)).catch(()=>{})}catch(e){}
    const nd=structuredClone(days);nd[di].stops[si].photos.splice(pi,1);
    await save({days:nd});flash('Foto eliminada');onClose()};
  return h('div',{className:'lightbox',onClick:onClose},
    h('img',{src:photo.url,onClick:e=>e.stopPropagation()}),
    editing?h('div',{style:{width:'100%',maxWidth:420,marginTop:14},onClick:e=>e.stopPropagation()},
        h('textarea',{value:cap,onChange:e=>setCap(e.target.value),autoFocus:true,placeholder:'Descreve este momento…',
          style:{background:'oklch(0.3 0.01 160)',color:'#fff',borderColor:'transparent'}}),
        h('button',{className:'btn',style:{marginTop:8},onClick:saveCap},'Guardar'))
      :h('div',{className:'lb-cap',onClick:e=>e.stopPropagation()},photo.cap||h('span',{style:{opacity:.5}},'Sem descrição')),
    !editing&&h('div',{className:'lb-acts',onClick:e=>e.stopPropagation()},
      h('button',{className:'btn ghost sm',onClick:()=>setEditing(true)},'Descrever'),
      h('button',{className:'btn coral sm',onClick:del},'Eliminar'),
      h('button',{className:'btn ghost sm',onClick:onClose},'Fechar'))
  );
}

/* ---------- FEED ---------- */
function Feed({posts,me,meU,flash}){
  const fileRef=useRef();
  const [cap,setCap]=useState(''),[pending,setPending]=useState(null),[busy,setBusy]=useState(false);
  const onFile=e=>{const f=e.target.files[0];if(!f)return;setPending(URL.createObjectURL(f));fileRef.current._file=f};
  const publish=async()=>{const f=fileRef.current?._file;if(!f){flash('Escolhe uma foto');return;}setBusy(true);
    try{const blob=await compress(f);const path=`trips/${TRIP_ID}/feed/${Date.now()}.jpg`;
      const r=sref(storage,path);await uploadBytes(r,blob);
      await addDoc(collection(db,'trips',TRIP_ID,'posts'),
        {url:await getDownloadURL(r),path,caption:cap,by:me,ts:Date.now(),likes:[],comments:[]});
      setCap('');setPending(null);fileRef.current.value='';fileRef.current._file=null;flash('Publicado');
    }catch(err){console.error(err);flash('Erro')}setBusy(false)};
  const like=p=>{const has=(p.likes||[]).includes(me);
    updateDoc(doc(db,'trips',TRIP_ID,'posts',p.id),{likes:has?p.likes.filter(x=>x!==me):[...(p.likes||[]),me]})};
  const comment=(p,t)=>{if(!t.trim())return;
    updateDoc(doc(db,'trips',TRIP_ID,'posts',p.id),{comments:[...(p.comments||[]),{by:me,txt:t.trim(),ts:Date.now()}]})};
  return h('div',{className:'scr'},
    h('div',{className:'post',style:{padding:'13px 14px'}},
      h('div',{style:{display:'flex',gap:11,alignItems:'center'}},
        h('div',{className:'avatar',style:{background:meU.color,width:36,height:36}},meU.initial),
        h('div',{style:{flex:1,fontWeight:500,color:'var(--ink-3)',fontSize:14}},'Partilha um momento…'),
        h('button',{className:'btn sm',onClick:()=>fileRef.current.click(),
          style:{display:'flex',alignItems:'center',gap:6}},h(Icon,{d:ICONS.camera,size:18}),'Foto')),
      h('input',{ref:fileRef,type:'file',accept:'image/*',capture:'environment',style:{display:'none'},onChange:onFile}),
      pending&&h('div',{style:{marginTop:11}},
        h('img',{src:pending,style:{width:'100%',borderRadius:14,maxHeight:300,objectFit:'cover',display:'block'}}),
        h('textarea',{placeholder:'Legenda…',value:cap,onChange:e=>setCap(e.target.value),style:{marginTop:9}}),
        h('button',{className:'btn',style:{marginTop:8},disabled:busy,onClick:publish},busy?'A publicar…':'Publicar'))),
    posts.length===0&&h('div',{className:'empty'},h(Icon,{d:ICONS.image,size:40}),h('div',null,'Ainda sem momentos.')),
    posts.map(p=>h(Post,{key:p.id,p,me,like,comment}))
  );
}

function Post({p,me,like,comment}){
  const u=USERS[p.by]||{name:'?',color:'#999',initial:'?'};
  const [txt,setTxt]=useState('');
  const liked=(p.likes||[]).includes(me);
  const when=new Date(p.ts).toLocaleString('pt-PT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  return h('div',{className:'post'},
    h('div',{className:'p-hd'},
      h('div',{className:'avatar',style:{background:u.color,width:34,height:34}},u.initial),
      h('div',{style:{flex:1}},h('div',{className:'nm'},u.name),h('div',{className:'tm tnum'},when))),
    h('img',{className:'p-img',src:p.url}),
    h('div',{className:'p-act'},
      h('button',{className:'act'+(liked?' liked':''),onClick:()=>like(p)},
        h(Icon,{d:ICONS.heart,size:22,fill:liked?'currentColor':'none'}),(p.likes||[]).length||''),
      h('button',{className:'act'},h(Icon,{d:ICONS.comment,size:22}),(p.comments||[]).length||'')),
    p.caption&&h('div',{className:'p-cap'},h('span',{className:'nm'},u.name+' '),p.caption),
    (p.comments||[]).length>0&&h('div',{className:'p-cmts'},
      (p.comments||[]).map((c,i)=>{const cu=USERS[c.by]||{name:'?'};
        return h('div',{key:i,className:'p-cmt'},h('span',{className:'nm'},cu.name+' '),c.txt)})),
    h('div',{className:'p-cmtbar'},
      h('input',{placeholder:'Comenta…',value:txt,onChange:e=>setTxt(e.target.value),
        onKeyDown:e=>{if(e.key==='Enter'){comment(p,txt);setTxt('')}}}),
      h('button',{className:'btn sm',onClick:()=>{comment(p,txt);setTxt('')},
        style:{display:'grid',placeItems:'center',width:44}},h(Icon,{d:ICONS.send,size:18})))
  );
}

/* ---------- SABORES ---------- */
function Comida({foods,me,save}){
  const [filter,setFilter]=useState('todas'),[edit,setEdit]=useState(null);
  const cats=[['todas','Tudo'],['bebida','Bebidas'],['prato','Pratos'],['doce','Doces']];
  const list=foods.filter(f=>filter==='todas'||f.cat===filter);
  const setVote=(fid,val)=>{const nf=structuredClone(foods);const f=nf.find(x=>x.id===fid);
    f.votes=f.votes||{};f.votes[me]={val,ts:Date.now()};save({foods:nf})};
  const tried=foods.filter(f=>f.votes&&f.votes[me]).length,pct=Math.round(tried/foods.length*100);
  return h('div',{className:'scr'},
    h('div',{className:'poncha-stat',style:{marginBottom:14}},
      h('div',{className:'pct'},tried),
      h('div',{style:{flex:1}},
        h('div',{className:'lbl'},'de '+foods.length+' provados · votos em tempo real'),
        h('div',{className:'bar'},h('span',{style:{width:pct+'%'}})))),
    h('div',{className:'seg'},cats.map(([k,l])=>
      h('button',{key:k,className:filter===k?'on':'',onClick:()=>setFilter(k)},l))),
    h('div',{className:'card'},list.map(f=>h(FoodItem,{key:f.id,f,me,onVote:()=>setEdit(f)}))),
    edit&&h(VoteSheet,{f:edit,me,onClose:()=>setEdit(null),onVote:setVote})
  );
}

function FoodItem({f,me,onVote}){
  const v=f.votes||{};
  const sq=uk=>{const val=v[uk]?.val,isYou=uk===me,has=val!=null;
    const cls='sq '+uk+(isYou?' you':'')+(has?' vfill':' vempty');
    return h('div',{className:cls,onClick:isYou?onVote:undefined},
      h('div',{className:'v'},has?val:(isYou?'+':'·')),h('div',{className:'l'},USERS[uk].name))};
  return h('div',{className:'f-item'},
    h('div',{className:'f-info'},h('div',{className:'f-name'},f.name,f.novo&&h('span',{className:'f-badge'},'novo')),
      h('div',{className:'f-cat'},f.cat)),
    h('div',{className:'scores'},sq('rui'),sq('rita')));
}

function VoteSheet({f,me,onClose,onVote}){
  const [val,setVal]=useState(f.votes?.[me]?.val ?? 7);
  const other=me==='rui'?'rita':'rui',ov=f.votes?.[other]?.val;
  return h('div',{className:'backdrop',onClick:onClose},
    h('div',{className:'sheet',onClick:e=>e.stopPropagation()},
      h('div',{className:'grab'}),h('h3',{className:'display'},f.name),
      h('p',{className:'muted',style:{marginTop:0}},
        ov!=null?`${USERS[other].name} deu ${ov}`:`${USERS[other].name} ainda não provou`),
      h('div',{className:'bignum',style:{color:'var(--brand-d)'}},val),
      h('input',{type:'range',min:0,max:10,step:1,value:val,onChange:e=>setVal(+e.target.value),style:{marginTop:10}}),
      h('div',{style:{display:'flex',justifyContent:'space-between'},className:'muted'},
        h('span',null,'0'),h('span',null,'a tua nota'),h('span',null,'10')),
      h('button',{className:'btn',style:{marginTop:18},onClick:()=>{onVote(f.id,val);onClose()}},'Guardar nota'),
      h('button',{className:'btn ghost',style:{marginTop:8},onClick:onClose},'Cancelar')
    ));
}

/* ---------- ROTA DA PONCHA (mapa híbrido Leaflet) ---------- */
function Poncha({bars,me,save,flash}){
  const mapEl=useRef(null), mapObj=useRef(null), markers=useRef({});
  const [mode,setMode]=useState('conquista'); // conquista | nota
  const [active,setActive]=useState(null);
  const [zona,setZona]=useState('todas');
  const [sort,setSort]=useState('zona'); // zona | az | melhor | pior | porprovar
  const [showFilters,setShowFilters]=useState(false);
  const itemRefs=useRef({});
  const geocoding=useRef(false);

  const tried=bars.filter(b=>b.votes&&Object.keys(b.votes).length).length;
  const pct=Math.round(tried/bars.length*100);

  // zonas disponíveis (ordenadas por frequência)
  const zonas=(()=>{ const c={}; bars.forEach(b=>{if(b.zona)c[b.zona]=(c[b.zona]||0)+1});
    return Object.keys(c).sort((a,b)=>c[b]-c[a]); })();

  const myAvg=(b)=>{const vs=b.votes?Object.values(b.votes).map(v=>v.val).filter(v=>v!=null):[];
    return vs.length?vs.reduce((a,c)=>a+c,0)/vs.length:null};

  // lista filtrada + ordenada
  const visible=(()=>{
    let list=bars.filter(b=>zona==='todas'||b.zona===zona);
    const av=(b)=>{const a=myAvg(b);return a!=null?a:(b.gRating??-1)};
    if(sort==='az') list=[...list].sort((a,b)=>a.name.localeCompare(b.name,'pt'));
    else if(sort==='melhor') list=[...list].sort((a,b)=>av(b)-av(a));
    else if(sort==='pior') list=[...list].sort((a,b)=>av(a)-av(b));
    else if(sort==='porprovar') list=[...list].sort((a,b)=>{
      const da=a.votes&&Object.keys(a.votes).length?1:0, db=b.votes&&Object.keys(b.votes).length?1:0;
      return da-db;});
    else { // por zona (agrupado), depois alfabético
      list=[...list].sort((a,b)=>(a.zona||'').localeCompare(b.zona||'','pt')||a.name.localeCompare(b.name,'pt'));
    }
    return list;
  })();

  const avg=myAvg;
  const pinColor=(b)=>{ const done=b.votes&&Object.keys(b.votes).length;
    if(mode==='conquista') return done?'oklch(0.58 0.13 156)':'oklch(0.72 0.018 160)';
    const a=avg(b); if(a==null) return 'oklch(0.80 0.018 160)';
    // mapa de calor: vermelho(0)→dourado(5)→verde(10)
    const hue=25+(a/10)*(150-25); return `oklch(0.62 0.16 ${hue})`;
  };

  // inicializar mapa Leaflet
  useEffect(()=>{ if(mapObj.current||!window.L||!mapEl.current)return;
    const L=window.L;
    const map=L.map(mapEl.current,{zoomControl:false,attributionControl:false})
      .setView([32.76,-16.96],10.2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {maxZoom:19}).addTo(map);
    L.control.zoom({position:'bottomright'}).addTo(map);
    mapObj.current=map;
    return ()=>{map.remove();mapObj.current=null};
  },[]);

  // (re)desenhar marcadores quando bars/mode mudam
  useEffect(()=>{ const L=window.L,map=mapObj.current; if(!L||!map)return;
    bars.forEach(b=>{ if(b.lat==null||b.lng==null)return;
      const color=pinColor(b);
      if(markers.current[b.id]){
        markers.current[b.id].setIcon(makeIcon(L,color));
      }else{
        const mk=L.marker([b.lat,b.lng],{icon:makeIcon(L,color)}).addTo(map);
        mk.on('click',()=>{ setActive(b.id);
          const el=itemRefs.current[b.id];
          if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); });
        mk.bindPopup(popupHtml(b));
        markers.current[b.id]=mk;
      }
      markers.current[b.id].setPopupContent(popupHtml(b));
    });
  },[bars,mode]);

  // geocodificar bares sem coordenadas (uma vez, no browser)
  useEffect(()=>{ if(geocoding.current)return;
    const missing=bars.filter(b=>b.lat==null||b.lng==null);
    if(!missing.length)return;
    geocoding.current=true;
    (async()=>{
      const updated=structuredClone(bars);
      let changed=false, count=0;
      for(const b of missing){
        if(count>=missing.length)break;
        try{
          const q=encodeURIComponent(b.name+', Madeira, Portugal');
          const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
            {headers:{'Accept':'application/json'}});
          const j=await r.json();
          if(j&&j[0]){ const idx=updated.findIndex(x=>x.id===b.id);
            updated[idx].lat=+j[0].lat; updated[idx].lng=+j[0].lon; changed=true; }
        }catch(e){}
        count++;
        await new Promise(r=>setTimeout(r,1100)); // respeitar limite Nominatim
        // guarda progresso a cada 10
        if(changed && count%10===0){ await save({bars:updated}); }
      }
      if(changed) await save({bars:updated});
      geocoding.current=false;
    })();
  },[bars.length]);

  const toggle=(b)=>{ // marca como provado/não (sem voto)
    const nb=structuredClone(bars);const x=nb.find(y=>y.id===b.id);
    x.votes=x.votes||{};
    if(x.votes[me]){ delete x.votes[me]; } else { x.votes[me]={val:x.votes[me]?.val??null,ts:Date.now()}; }
    save({bars:nb});
  };
  const [voteFor,setVoteFor]=useState(null);
  const setVote=(bid,val)=>{const nb=structuredClone(bars);const x=nb.find(y=>y.id===bid);
    x.votes=x.votes||{};x.votes[me]={val,ts:Date.now()};save({bars:nb})};

  return h('div',{className:'scr'},
    h('div',{className:'poncha-map'},
      h('div',{ref:mapEl,style:{width:'100%',height:'100%'}}),
      h('div',{className:'map-toggle'},
        h('button',{className:mode==='conquista'?'on':'',onClick:()=>setMode('conquista')},'Conquista'),
        h('button',{className:mode==='nota'?'on':'',onClick:()=>setMode('nota')},'Nota'))),
    h('div',{className:'poncha-stat'},
      h('div',{className:'pct'},pct+'%'),
      h('div',{style:{flex:1}},
        h('div',{className:'lbl'},tried+' de '+bars.length+' bares conquistados'),
        h('div',{className:'bar'},h('span',{style:{width:pct+'%'}})))),
    // controlos de filtro/ordenação
    h('div',{style:{display:'flex',gap:8,marginBottom:12}},
      h('select',{value:zona,onChange:e=>setZona(e.target.value),
        style:{flex:1,padding:'10px 12px',fontSize:14}},
        h('option',{value:'todas'},'Todas as zonas'),
        zonas.map(z=>h('option',{key:z,value:z},z))),
      h('select',{value:sort,onChange:e=>setSort(e.target.value),
        style:{flex:1,padding:'10px 12px',fontSize:14}},
        h('option',{value:'zona'},'Por zona'),
        h('option',{value:'az'},'A → Z'),
        h('option',{value:'melhor'},'Melhor nota'),
        h('option',{value:'pior'},'Pior nota'),
        h('option',{value:'porprovar'},'Por provar'))),
    h('div',{className:'card'},
      visible.map((b,i)=>{
        const showZona = sort==='zona' && (i===0||visible[i-1].zona!==b.zona);
        return h(React.Fragment,{key:b.id},
          showZona&&h('div',{style:{padding:'10px 16px 4px',fontSize:12,fontWeight:700,
            color:'var(--brand-d)',textTransform:'uppercase',letterSpacing:'.04em',
            background:'var(--brand-pa)'}},b.zona||'Sem zona'),
          h(BarItem,{b,me,active:active===b.id,
            setRef:(el)=>itemRefs.current[b.id]=el,
            onToggle:()=>toggle(b),onVote:()=>setVoteFor(b)}));
      })),
    voteFor&&h(BarVoteSheet,{b:voteFor,me,onClose:()=>setVoteFor(null),onVote:setVote})
  );
}

function makeIcon(L,color){
  return L.divIcon({className:'',html:`<div class="pin" style="background:${color}"></div>`,
    iconSize:[24,24],iconAnchor:[12,22],popupAnchor:[0,-20]});
}
function popupHtml(b){
  const v=b.votes||{};
  const chip=(uk)=>v[uk]?.val!=null?`<span class="popup-v" style="background:${uk==='rui'?'var(--rui-pa)':'var(--rita-pa)'};color:${uk==='rui'?'var(--rui)':'var(--rita)'}">${USERS[uk].name} ${v[uk].val}</span>`:'';
  return `<div class="popup-name">${b.name}</div>`+
    (b.zona?`<div class="popup-zona">${b.zona}</div>`:'')+
    `<div class="popup-votes">${chip('rui')}${chip('rita')}</div>`;
}

function BarItem({b,me,active,setRef,onToggle,onVote}){
  const v=b.votes||{};
  const done=Object.keys(v).length>0;
  const sq=uk=>{const val=v[uk]?.val,isYou=uk===me,has=val!=null;
    const cls='sq '+uk+(isYou?' you':'')+(has?' vfill':' vempty');
    return h('div',{className:cls,style:{width:40,flex:'0 0 40px',height:40},
      onClick:isYou?onVote:undefined},
      h('div',{className:'v',style:{fontSize:15}},has?val:(isYou?'+':'·')),
      h('div',{className:'l'},USERS[uk].name))};
  return h('div',{className:'bar-item'+(active?' active':''),ref:setRef},
    h('div',{className:'bar-tick'+(done?' on':''),onClick:onToggle},h(Icon,{d:ICONS.check,size:14})),
    h('div',{className:'bar-info'},
      h('div',{className:'bar-name'},b.name,
        b.gRating&&h('span',{className:'bar-rating'},'★ '+b.gRating)),
      b.zona&&h('div',{className:'bar-zona'},b.zona),
      h('div',{className:'bar-actions'},
        h('a',{className:'bar-mini',href:mapsUrl(b.name),target:'_blank',rel:'noopener'},
          h(Icon,{d:ICONS.pin,size:13}),'Maps'),
        h('a',{className:'bar-mini',href:wazeUrl(b.name),target:'_blank',rel:'noopener'},
          h(Icon,{d:ICONS.nav,size:13}),'Waze'))),
    h('div',{className:'scores'},sq('rui'),sq('rita'))
  );
}

function BarVoteSheet({b,me,onClose,onVote}){
  const [val,setVal]=useState(b.votes?.[me]?.val ?? 7);
  const other=me==='rui'?'rita':'rui',ov=b.votes?.[other]?.val;
  return h('div',{className:'backdrop',onClick:onClose},
    h('div',{className:'sheet',onClick:e=>e.stopPropagation()},
      h('div',{className:'grab'}),h('h3',{className:'display'},b.name),
      h('p',{className:'muted',style:{marginTop:0}},
        ov!=null?`${USERS[other].name} deu ${ov}`:`${USERS[other].name} ainda não provou aqui`),
      h('div',{className:'bignum',style:{color:'var(--brand-d)'}},val),
      h('input',{type:'range',min:0,max:10,step:1,value:val,onChange:e=>setVal(+e.target.value),style:{marginTop:10}}),
      h('div',{style:{display:'flex',justifyContent:'space-between'},className:'muted'},
        h('span',null,'0'),h('span',null,'a tua poncha aqui'),h('span',null,'10')),
      h('button',{className:'btn',style:{marginTop:18},onClick:()=>{onVote(b.id,val);onClose()}},'Guardar nota'),
      h('button',{className:'btn ghost',style:{marginTop:8},onClick:onClose},'Cancelar')
    ));
}

/* ---------- MONTAGEM ---------- */
function Video({days,posts}){
  const [playing,setPlaying]=useState(false),[idx,setIdx]=useState(0);
  const all=[];
  days.forEach(d=>d.stops.forEach(s=>(s.photos||[]).forEach(p=>
    all.push({url:p.url,cap:p.cap||s.name,place:s.name,day:d.date,ts:p.ts}))));
  posts.forEach(p=>all.push({url:p.url,cap:p.caption,place:p.caption||'Momento',
    day:new Date(p.ts).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}),ts:p.ts}));
  all.sort((a,b)=>(a.ts||0)-(b.ts||0));
  useEffect(()=>{if(!playing||!all.length)return;
    const t=setInterval(()=>setIdx(i=>(i+1)%all.length),1500);return ()=>clearInterval(t)},[playing,all.length]);
  return h('div',{className:'scr'},
    all.length===0?h('div',{className:'empty'},h(Icon,{d:ICONS.play,size:40}),
        h('div',null,'Adiciona fotos no itinerário ou no diário para criar a montagem.'))
      :h('div',null,
        h('div',{className:'section-label'},all.length+' fotos · ordem cronológica'),
        h('div',{className:'cinema'},h('img',{key:idx,src:all[idx].url}),
          h('div',{className:'ov'},h('div',{className:'pl'},all[idx].cap),h('div',{className:'dy'},all[idx].day))),
        h('div',{className:'foot-actions',style:{padding:'12px 0 0'}},
          h('button',{className:'btn',style:{flex:1},onClick:()=>setPlaying(p=>!p)},playing?'Pausa':'Reproduzir'),
          h('button',{className:'btn ghost sm',onClick:()=>setIdx(i=>(i+1)%all.length)},'Seguinte')),
        h('div',{className:'muted center',style:{marginTop:8}},(idx+1)+' / '+all.length),
        h('div',{className:'strip'},all.map((p,i)=>h('img',{key:i,src:p.url,className:i===idx?'cur':'',onClick:()=>setIdx(i)}))),
        h('div',{className:'muted center',style:{marginTop:14,padding:'0 24px'}},
          'Para guardar como vídeo, usa a gravação de ecrã do telemóvel durante a reprodução.'))
  );
}

/* ---------- TAB BAR ---------- */
function TabBar({tab,setTab}){
  const items=[['plano','Plano',ICONS.list],['feed','Diário',ICONS.image],
    ['comida','Sabores',ICONS.cup],['poncha','Poncha',ICONS.glass],['video','Vídeo',ICONS.play]];
  return h('div',{className:'tabbar'},items.map(([k,l,d])=>
    h('button',{key:k,className:'tabbtn'+(tab===k?' on':''),onClick:()=>setTab(k)},
      h(Icon,{d,size:25}),h('span',null,l))));
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

/* carregar Leaflet JS dinamicamente (depois do React montar) */
(function(){ if(window.L)return;
  const s=document.createElement('script');
  s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.crossOrigin=''; document.head.appendChild(s);
})();
