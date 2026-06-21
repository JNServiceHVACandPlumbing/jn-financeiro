import { useState, useMemo, useCallback, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Area, ComposedChart } from "recharts";

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDLm72ptmtpzxEYt9FYS1eF1-5PuUshHSM",
  authDomain: "jn-service-financial-tool.firebaseapp.com",
  projectId: "jn-service-financial-tool",
  storageBucket: "jn-service-financial-tool.firebasestorage.app",
  messagingSenderId: "492476006410",
  appId: "1:492476006410:web:cfb0793a6f959bda685ff3"
};
const fireApp = initializeApp(firebaseConfig);
const db = getFirestore(fireApp);
async function fbSet(col, id, data) { try { await setDoc(doc(db,col,id),data); } catch(e){console.error(e);} }
async function fbSetDoc(docPath, data) { try { const parts=docPath.split("/"); await setDoc(doc(db,...parts),data); } catch(e){console.error(e);} }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = { red:"#E8392A",blue:"#4ABCD4",orange:"#E8622A",yellow:"#F5A623",teal:"#1B7A8A",green:"#34d399",amber:"#fbbf24",re:"#f87171",text1:"#f5f5f5",text2:"#999999" };
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const JOBBER_MAP = {
  "gas":"cogs_fuel","softwares":"softwares","fixes costs - admin":"custos_fixos","fixes costs   admin":"custos_fixos",
  "leads & marketing":"mkt","leads and marketing":"mkt","admin salaries":"sal_adm","stock":"estoque",
  "materials, equipments & permits - jobs":"cogs_materials","materials, equipments & permits   jobs":"cogs_materials",
  "employees payment - subcontract":"cogs_subs","employees payment   subcontract":"cogs_subs",
  "company expense - general costs and adm":"desp_gerais","company expense   general costs and adm":"desp_gerais",
  "financial expenses - accounting, licenses and insurance":"contabilidade","financial expenses   accounting, licenses and insurance":"contabilidade",
  "non used - junior payments":null,"non used   junior payments":null,"non used - guilherme payments":null,"non used   guilherme payments":null,
  "csv - materials":"cogs_materials","materials":"cogs_materials","csv - subcontractors":"cogs_subs","subcontractors":"cogs_subs",
  "csv - gas":"cogs_fuel","fuel":"cogs_fuel","marketing":"mkt","admin payments":"sal_adm","wages - adm":"sal_adm",
  "wages - operations support":"sal_ops","rent & utilities":"custos_fixos","software & tech":"softwares",
  "accounting, licenses & insurance":"contabilidade","professional fees & insurance":"contabilidade",
  "admin & general expenses":"desp_gerais","general & admin expenses":"desp_gerais",
  "financial expenses":"taxas_bank","bank charges":"taxas_bank","genn platform":"cogs_genn",
};

const DRE_LABELS = {
  rev_operacional:"Receita Operacional",rev_genn:"Receita Recorrente GENN",impostos:"Impostos sobre a venda",
  receita_liquida:"= Receita Líquida",cogs_materials:"Custo das Mercadorias Vendidas",cogs_genn:"Custo Plataforma GENN",
  cogs_subs:"Custo dos Subcontratados",cogs_fuel:"Gasolina",margem:"= Margem de Contribuição",
  mkt:"Despesas com Marketing",sal_ops:"Salários Suporte Operacional",sal_adm:"Salários Adm",
  custos_fixos:"Custos Fixos Administrativos",estoque:"Estoque / Inventário",softwares:"Softwares",contabilidade:"Contabilidade, Licenças, Seguros",
  lucro_op:"= Lucro Operacional",desp_gerais:"Despesas Gerais e Adm",taxas_bank:"Taxas Bank, Juros",lucro_ir:"= Lucro Antes do IR",
};

const DRE_INPUT_KEYS = ["rev_operacional","rev_genn","impostos","cogs_materials","cogs_genn","cogs_subs","cogs_fuel","mkt","sal_ops","sal_adm","custos_fixos","estoque","softwares","contabilidade","desp_gerais","taxas_bank"];

const DRE_STRUCTURE = [
  {key:"rev_operacional",type:"input"},{key:"rev_genn",type:"input"},{key:"impostos",type:"input"},{key:"receita_liquida",type:"calc"},
  {key:"cogs_materials",type:"input"},{key:"cogs_genn",type:"input"},{key:"cogs_subs",type:"input"},{key:"cogs_fuel",type:"input"},{key:"margem",type:"calc"},
  {key:"mkt",type:"input"},{key:"sal_ops",type:"input"},{key:"sal_adm",type:"input"},{key:"custos_fixos",type:"input"},{key:"estoque",type:"input"},{key:"softwares",type:"input"},{key:"contabilidade",type:"input"},{key:"lucro_op",type:"calc"},
  {key:"desp_gerais",type:"input"},{key:"taxas_bank",type:"input"},{key:"lucro_ir",type:"calc"},
];

const HIST_R = {
  "2026-0":{rev_operacional:70469,rev_genn:0,impostos:0,cogs_materials:27177,cogs_genn:1200,cogs_subs:15002,cogs_fuel:1829,mkt:12572,sal_ops:3600,sal_adm:15978,custos_fixos:6147,softwares:704,contabilidade:4141,desp_gerais:1684,taxas_bank:0},
  "2026-1":{rev_operacional:123473,rev_genn:0,impostos:0,cogs_materials:28699,cogs_genn:4690,cogs_subs:18750,cogs_fuel:1612,mkt:12962,sal_ops:3640,sal_adm:18291,custos_fixos:13267,softwares:913,contabilidade:2867,desp_gerais:3675,taxas_bank:0},
  "2026-2":{rev_operacional:131282,rev_genn:53.10,impostos:0,cogs_materials:22659,cogs_genn:1200,cogs_subs:49800,cogs_fuel:1922,mkt:14037,sal_ops:0,sal_adm:20947,custos_fixos:12608,softwares:903,contabilidade:5861,desp_gerais:2601,taxas_bank:0},
  "2026-3":{rev_operacional:47828,rev_genn:1366.45,impostos:0,cogs_materials:23328,cogs_genn:0,cogs_subs:27918,cogs_fuel:2615,mkt:16229,sal_ops:0,sal_adm:17695,custos_fixos:17165,softwares:682,contabilidade:5069,desp_gerais:16677,taxas_bank:0},
};
const HIST_E = {
  "2026-0":{rev_operacional:177000,rev_genn:0,impostos:0,cogs_materials:59177,cogs_genn:1200,cogs_subs:22502,cogs_fuel:1829,mkt:12572,sal_ops:3600,sal_adm:15978,custos_fixos:6147,softwares:704,contabilidade:4141,desp_gerais:1684,taxas_bank:0},
  "2026-1":{rev_operacional:198873,rev_genn:0,impostos:0,cogs_materials:59099,cogs_genn:3500,cogs_subs:24250,cogs_fuel:1900,mkt:12962,sal_ops:3640,sal_adm:18291,custos_fixos:13267,softwares:913,contabilidade:2867,desp_gerais:3675,taxas_bank:0},
  "2026-2":{rev_operacional:247922,rev_genn:53.10,impostos:0,cogs_materials:68559,cogs_genn:1200,cogs_subs:65600,cogs_fuel:1922,mkt:14037,sal_ops:0,sal_adm:20947,custos_fixos:12608,softwares:903,contabilidade:5861,desp_gerais:2601,taxas_bank:0},
  "2026-3":{rev_operacional:432550,rev_genn:1366.45,impostos:0,cogs_materials:23328,cogs_genn:1200,cogs_subs:27918,cogs_fuel:2615,mkt:16229,sal_ops:0,sal_adm:17695,custos_fixos:17165,softwares:682,contabilidade:5069,desp_gerais:16677,taxas_bank:0},
};


// ─── HISTORICAL RECEIVABLES ───────────────────────────────────────────────────
const HIST_RECEIVABLES = [
  {id:"hist_1000",client:"Pourya Hoseini",job:"",total:10000,deposited:10000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:true,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1001",client:"Carlo Digiantommaso",job:"",total:10000,deposited:10000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:true,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1002",client:"Revival Development",job:"",total:7600,deposited:7600,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1003",client:"Revival Development",job:"",total:7600,deposited:7600,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1004",client:"Revival Development",job:"",total:3900,deposited:3900,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1005",client:"Freda",job:"",total:600,deposited:600,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1006",client:"Freda",job:"",total:600,deposited:600,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1007",client:"Freda",job:"",total:600,deposited:600,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1008",client:"Freda",job:"",total:600,deposited:600,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1009",client:"Freda",job:"",total:600,deposited:600,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1010",client:"Peter Pilla",job:"",total:10000,deposited:10000,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:true,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1011",client:"Tommy",job:"",total:6760,deposited:6760,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1012",client:"Tommy",job:"",total:6760,deposited:6760,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1013",client:"Tommy",job:"",total:8000,deposited:8000,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1014",client:"Tommy",job:"",total:1203,deposited:1203,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1015",client:"Franck Garofalo",job:"",total:4000,deposited:4000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1016",client:"Franck Garofalo",job:"",total:17600,deposited:17600,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1017",client:"Franck Garofalo",job:"",total:6000,deposited:6000,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1018",client:"Scott Peterson",job:"",total:18625,deposited:0,remaining:18625,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"pending",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1019",client:"Michael St Louis",job:"",total:12000,deposited:12000,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:true,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1020",client:"Michael St Louis",job:"",total:900,deposited:0,remaining:900,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:true,status:"pending",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1021",client:"Michael St Louis",job:"",total:10000,deposited:0,remaining:10000,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:true,status:"pending",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1022",client:"Christine Ryan",job:"",total:12470,deposited:12470,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1023",client:"Nathan",job:"",total:495,deposited:495,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1024",client:"Andrea Madrona",job:"",total:25000,deposited:0,remaining:25000,billedDate:"2026-09-01",dueDate:"2026-09-15",massSave:false,status:"pending",notes:"",createdAt:"2026-09-01T00:00:00.000Z"},
  {id:"hist_1025",client:"Andrea Madrona",job:"",total:14500,deposited:0,remaining:14500,billedDate:"2026-10-01",dueDate:"2026-10-15",massSave:false,status:"pending",notes:"",createdAt:"2026-10-01T00:00:00.000Z"},
  {id:"hist_1026",client:"Andrea Madrona",job:"",total:8500,deposited:0,remaining:8500,billedDate:"2026-11-01",dueDate:"2026-11-15",massSave:false,status:"pending",notes:"",createdAt:"2026-11-01T00:00:00.000Z"},
  {id:"hist_1027",client:"Robinson",job:"",total:7900,deposited:7900,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1028",client:"Adam Volin",job:"",total:4782,deposited:4782,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1029",client:"Scott Gould",job:"",total:2151,deposited:2151,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1030",client:"Scott Gould",job:"",total:4945,deposited:4945,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1031",client:"Flawless Construction",job:"",total:2800,deposited:2800,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1032",client:"Lowell Dsouza",job:"",total:9000,deposited:9000,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1033",client:"Lowell Dsouza",job:"",total:4000,deposited:4000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1034",client:"Lowell Dsouza",job:"",total:500,deposited:500,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1035",client:"Kurtis",job:"",total:2020,deposited:2020,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1036",client:"Angel Soto",job:"",total:10000,deposited:10000,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1037",client:"Eric Robichaud",job:"",total:7875,deposited:7875,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1038",client:"Eric Robichaud",job:"",total:2000,deposited:2000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1039",client:"Michelle Trahn",job:"",total:9590,deposited:9590,remaining:0,billedDate:"2026-01-01",dueDate:"2026-01-15",massSave:false,status:"paid",notes:"",createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"hist_1040",client:"Michelle Trahn",job:"",total:8839,deposited:8839,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1041",client:"Ezequias",job:"",total:13282,deposited:13282,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1042",client:"Ezequias",job:"",total:13282,deposited:13282,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1043",client:"Sabrina Ibarra",job:"",total:11874,deposited:11874,remaining:0,billedDate:"2026-02-01",dueDate:"2026-02-15",massSave:false,status:"paid",notes:"",createdAt:"2026-02-01T00:00:00.000Z"},
  {id:"hist_1044",client:"Sabrina Ibarra",job:"",total:12108,deposited:12108,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1045",client:"Sabrina Ibarra",job:"",total:3485,deposited:3485,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1046",client:"Shoulin",job:"",total:25000,deposited:25000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:true,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1047",client:"Shoulin",job:"",total:3715,deposited:3715,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:true,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1048",client:"Sidone",job:"",total:3500,deposited:3500,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1049",client:"Sidone",job:"",total:3000,deposited:3000,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1050",client:"Andrew Frank",job:"",total:7512,deposited:7512,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:false,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1051",client:"Andrew Frank",job:"",total:7512,deposited:7512,remaining:0,billedDate:"2026-04-01",dueDate:"2026-04-15",massSave:false,status:"paid",notes:"",createdAt:"2026-04-01T00:00:00.000Z"},
  {id:"hist_1052",client:"Eka",job:"",total:25000,deposited:25000,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:true,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1053",client:"Eka",job:"",total:8500,deposited:8500,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:true,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1054",client:"Cleber",job:"",total:4333,deposited:4333,remaining:0,billedDate:"2026-03-01",dueDate:"2026-03-15",massSave:true,status:"paid",notes:"",createdAt:"2026-03-01T00:00:00.000Z"},
  {id:"hist_1055",client:"Cleber",job:"",total:8667,deposited:8667,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:true,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1056",client:"Andy",job:"",total:21200,deposited:21200,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1057",client:"Andy",job:"",total:21200,deposited:21200,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1058",client:"Andy",job:"",total:7600,deposited:0,remaining:7600,billedDate:"2026-07-01",dueDate:"2026-07-15",massSave:false,status:"pending",notes:"",createdAt:"2026-07-01T00:00:00.000Z"},
  {id:"hist_1059",client:"Willscott",job:"",total:8248,deposited:8248,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1060",client:"Willscott",job:"",total:8248,deposited:8248,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1061",client:"Brian Casey",job:"",total:17860,deposited:17860,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:true,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1062",client:"Jasmine Shovlin",job:"",total:16505,deposited:16505,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1063",client:"Ann-Marie",job:"",total:15406,deposited:15406,remaining:0,billedDate:"2026-05-01",dueDate:"2026-05-15",massSave:false,status:"paid",notes:"",createdAt:"2026-05-01T00:00:00.000Z"},
  {id:"hist_1064",client:"Joe Roberts",job:"",total:29500,deposited:29500,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:true,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1065",client:"Marguerite Guillaume",job:"",total:20828,deposited:20828,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:true,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1066",client:"Samuel Kang",job:"",total:6975,deposited:6975,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1067",client:"Samuel Kang",job:"",total:6975,deposited:0,remaining:6975,billedDate:"2026-07-01",dueDate:"2026-07-15",massSave:false,status:"pending",notes:"",createdAt:"2026-07-01T00:00:00.000Z"},
  {id:"hist_1068",client:"Gary Smith",job:"",total:1693,deposited:1693,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1069",client:"Gary Smith",job:"",total:1693,deposited:0,remaining:1693,billedDate:"2026-07-01",dueDate:"2026-07-15",massSave:false,status:"pending",notes:"",createdAt:"2026-07-01T00:00:00.000Z"},
  {id:"hist_1070",client:"Amit Rai",job:"",total:4210,deposited:4210,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:true,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1071",client:"Amit Rai",job:"",total:4202,deposited:0,remaining:4202,billedDate:"2026-07-01",dueDate:"2026-07-15",massSave:true,status:"pending",notes:"",createdAt:"2026-07-01T00:00:00.000Z"},
  {id:"hist_1072",client:"Amit Rai",job:"",total:7165,deposited:0,remaining:7165,billedDate:"2026-08-01",dueDate:"2026-08-15",massSave:true,status:"pending",notes:"",createdAt:"2026-08-01T00:00:00.000Z"},
  {id:"hist_1073",client:"Amit Rai",job:"",total:4291,deposited:0,remaining:4291,billedDate:"2026-09-01",dueDate:"2026-09-15",massSave:true,status:"pending",notes:"",createdAt:"2026-09-01T00:00:00.000Z"},
  {id:"hist_1074",client:"Air Culin",job:"",total:9562,deposited:9562,remaining:0,billedDate:"2026-06-01",dueDate:"2026-06-15",massSave:false,status:"paid",notes:"",createdAt:"2026-06-01T00:00:00.000Z"},
  {id:"hist_1075",client:"Air Culin",job:"",total:9562,deposited:0,remaining:9562,billedDate:"2026-07-01",dueDate:"2026-07-15",massSave:false,status:"pending",notes:"",createdAt:"2026-07-01T00:00:00.000Z"},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = n => n==null||n===""?"":"$"+Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = n => {const v=Math.abs(Number(n)||0);return (Number(n)<0?"-":"")+"$"+(v>=1000?(v/1000).toFixed(1)+"k":v.toFixed(0));};
const fmtNum = n => n==null||n===""?0:Number(n)||0;
const today = new Date();
const todayStr = today.toISOString().split("T")[0];

// Parse a YYYY-MM-DD (or ISO datetime) string as a LOCAL date (avoids UTC-shift bugs in negative timezones)
function parseLocalDate(d){
  if(!d) return null;
  if(typeof d!=="string") return new Date(d);
  const datePart=d.split("T")[0]; // strip time portion if present (ISO datetime)
  const parts=datePart.split("-");
  if(parts.length===3) return new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));
  return new Date(d);
}
function agingDays(d){if(!d) return null;const dt=parseLocalDate(d);return Math.floor((today-dt)/86400000);}
function agingLabel(days){
  if(days===null) return {label:"—",color:"#888"};
  if(days<0) return {label:`Due in ${Math.abs(days)}d`,color:C.green};
  if(days===0) return {label:"Due today",color:C.amber};
  if(days<=7) return {label:`${days}d overdue`,color:C.amber};
  if(days<=30) return {label:`${days}d overdue`,color:C.red};
  return {label:`${days}d overdue`,color:"#991b1b"};
}

function computeDRE(d){
  const v=k=>fmtNum(d[k]);
  const receita_liquida=v("rev_operacional")+v("rev_genn")-v("impostos");
  const margem=receita_liquida-v("cogs_materials")-v("cogs_genn")-v("cogs_subs")-v("cogs_fuel");
  const lucro_op=margem-v("mkt")-v("sal_ops")-v("sal_adm")-v("custos_fixos")-v("estoque")-v("softwares")-v("contabilidade");
  const lucro_ir=lucro_op-v("desp_gerais")-v("taxas_bank");
  return {...d,receita_liquida,margem,lucro_op,lucro_ir};
}

function getBaseForMonth(data,year,month){
  const key=`${year}-${month}`;
  const fromFirebase=data.dreData?.[key];
  const fromHist=HIST_R[key];
  const base=fromFirebase||fromHist||null;
  // Treat a month as "no DRE data yet" if revenue is zero/missing — prevents partial/test
  // documents (e.g. only a stray eco adjustment field) from polluting Analytics totals.
  if(!base) return null;
  if(fmtNum(base.rev_operacional)<=0 && fmtNum(base.rev_genn)<=0) return null;
  return base;
}

function getDREForMonth(data,year,month,type){
  const key=`${year}-${month}`;
  const base=getBaseForMonth(data,year,month);
  if(type==="eco"){
    if(!base) return null;
    // Extra economic adjustments default to HIST_E delta (if no manual override saved yet)
    const histEcoDelta=HIST_E[key]?Object.fromEntries(DRE_INPUT_KEYS.map(k=>[k,Math.max(0,(HIST_E[key]?.[k]||0)-(HIST_R[key]?.[k]||0))])):{};
    const extra=data.dreEcoExtra?.[key]||histEcoDelta;
    const merged={...base};
    DRE_INPUT_KEYS.forEach(k=>{merged[k]=fmtNum(base[k])+fmtNum(extra[k]);});
    return merged;
  }
  // Realizada: base + manual adjustments
  if(!base) return null;
  const adj=data.dreAdj?.[key]||{};
  const merged={...base};
  DRE_INPUT_KEYS.forEach(k=>{merged[k]=fmtNum(base[k])+fmtNum(adj[k]);});
  return merged;
}

// Full CSV parser that respects quoted fields containing newlines (Jobber exports can have \n inside quoted cells)
function parseCSVFull(text){
  const rows=[];
  let row=[],cur="",inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQ){
      if(ch==='"'){
        if(text[i+1]==='"'){cur+='"';i++;} // escaped quote
        else inQ=false;
      } else cur+=ch;
    } else {
      if(ch==='"') inQ=true;
      else if(ch===','){row.push(cur);cur="";}
      else if(ch==='\r'){/* skip */}
      else if(ch==='\n'){row.push(cur);cur="";rows.push(row);row=[];}
      else cur+=ch;
    }
  }
  if(cur!==""||row.length>0){row.push(cur);rows.push(row);}
  return rows.map(r=>r.map(c=>c.trim()));
}

function parseJobberCSV(text){
  const allRows=parseCSVFull(text);
  const hi=allRows.findIndex(r=>r.some(c=>c.toLowerCase()==="item name")||r.some(c=>c.toLowerCase()==="client name"));
  if(hi===-1) return null;
  const dataRows=allRows.slice(hi).filter(r=>r.length>1||r[0]!=="");
  if(dataRows.length<2) return null;
  const headers=dataRows[0].map(h=>h.toLowerCase());
  const rows=dataRows.slice(1).filter(r=>r.length>0&&r[0]&&!r[0].toLowerCase().startsWith("report totals")).map(cols=>{const obj={};headers.forEach((h,i)=>{obj[h]=cols[i]||"";});return obj;});
  return {headers,rows};
}

function parseExpenses(text){
  const p=parseJobberCSV(text);if(!p) return {totals:{},daily:[]};
  const totals={};const daily=[];
  const catKey=p.headers.find(h=>h==="act. code"||h.includes("act.")||h.includes("category"));
  const amtKey=p.headers.find(h=>h==="total $"||h.includes("total"));
  const dateKey=p.headers.find(h=>h==="date");
  for(const row of p.rows){
    const cat=(row[catKey]||"").toLowerCase().trim().replace(/\s+/g," ");
    const amt=parseFloat((row[amtKey]||"0").replace(/[$,]/g,""))||0;
    const rawDate=row[dateKey]||"";
    if(!cat||amt===0) continue;
    const mapped=JOBBER_MAP[cat];
    if(mapped===null) continue;
    if(mapped) totals[mapped]=(totals[mapped]||0)+amt;
    else totals["_u_"+cat]=(totals["_u_"+cat]||0)+amt;
    if(rawDate){try{const d=new Date(rawDate);if(!isNaN(d.getTime())){const ds=d.toISOString().split("T")[0];daily.push({date:ds,amount:-amt,type:"expense",description:row["item name"]||cat,sourceType:"exp"});}}catch(e){}}
  }
  return {totals,daily};
}

function parsePayments(text){
  const p=parseJobberCSV(text);if(!p) return {totals:{},daily:[]};
  const totals={};const daily=[];
  const amtKey=p.headers.find(h=>h==="total $"||h.includes("total"));
  const typeKey=p.headers.find(h=>h==="type");
  const dateKey=p.headers.find(h=>h==="date");
  const clientKey=p.headers.find(h=>h==="client name");
  for(const row of p.rows){
    const type=(row[typeKey]||"").toLowerCase();
    if(type==="refund"||type==="credit") continue;
    const amt=Math.abs(parseFloat((row[amtKey]||"0").replace(/[$,]/g,""))||0);
    const rawDate=row[dateKey]||"";
    if(amt>0){
      totals["rev_operacional"]=(totals["rev_operacional"]||0)+amt;
      if(rawDate){try{const d=new Date(rawDate);if(!isNaN(d.getTime())){const ds=d.toISOString().split("T")[0];daily.push({date:ds,amount:amt,type:"payment",description:row[clientKey]||"Payment",sourceType:"pay"});}}catch(e){}}
    }
  }
  return {totals,daily};
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
body{font-family:'DM Sans',sans-serif;background:#0b0b0d;color:#f5f5f5;min-height:100vh;}
:root{--r:#E8392A;--b:#4ABCD4;--o:#E8622A;--y:#F5A623;--t:#1B7A8A;--g:#34d399;--am:#fbbf24;--re:#f87171;--bg1:#141416;--bg2:#1c1c1f;--bg3:#26262a;--bdr:rgba(255,255,255,0.08);--t1:#f5f5f5;--t2:#9a9aa0;--mono:'DM Mono',monospace;
  --grad-jn:linear-gradient(100deg,#E8392A 0%,#E8622A 33%,#F5A623 66%,#4ABCD4 100%);
  --grad-jn-soft:linear-gradient(110deg,rgba(232,57,42,0.14) 0%,rgba(232,98,42,0.10) 38%,rgba(245,166,35,0.08) 68%,rgba(74,188,212,0.12) 100%);
}
.app{display:flex;flex-direction:column;min-height:100vh;min-height:100dvh;}

/* ── TOPBAR ───────────────────────────────────────────────── */
.topbar{position:relative;background:var(--bg1);border-bottom:1px solid var(--bdr);padding:0 20px;display:flex;align-items:center;gap:10px;height:56px;position:sticky;top:0;z-index:100;overflow:hidden;}
.topbar::before{content:"";position:absolute;inset:0;background:var(--grad-jn);opacity:0.08;pointer-events:none;}
.topbar::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--grad-jn);}
.logo{font-size:14px;font-weight:700;color:var(--t1);white-space:nowrap;flex-shrink:0;position:relative;letter-spacing:.2px;}
.logo span{background:var(--grad-jn);-webkit-background-clip:text;background-clip:text;color:transparent;}
.stabs{display:flex;gap:2px;background:var(--bg3);padding:3px;border-radius:8px;flex-shrink:0;position:relative;}
.stab{background:none;border:none;color:var(--t2);padding:6px 13px;border-radius:6px;font-size:12px;font-family:'DM Sans';cursor:pointer;transition:all 0.15s;font-weight:600;white-space:nowrap;}
.stab.active{background:var(--grad-jn);color:white;box-shadow:0 2px 10px rgba(232,57,42,0.35);}
.msel{background:var(--bg2);border:1px solid var(--bdr);color:var(--t1);padding:6px 11px;border-radius:7px;font-size:13px;font-family:'DM Sans';cursor:pointer;flex-shrink:0;font-weight:500;}
.subnav{position:relative;background:var(--bg1);border-bottom:1px solid var(--bdr);padding:0 20px;display:flex;align-items:center;gap:2px;height:42px;position:sticky;top:56px;z-index:99;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.subnav::-webkit-scrollbar{display:none;}
.nb{background:none;border:none;color:var(--t2);padding:7px 14px;border-radius:7px;font-size:12px;font-family:'DM Sans';cursor:pointer;transition:all 0.15s;font-weight:600;white-space:nowrap;flex-shrink:0;}
.nb:hover{background:var(--bg3);color:var(--t1);}
.nb.ac{background:var(--grad-jn);color:white;box-shadow:0 2px 8px rgba(232,57,42,0.3);}
.nb.at{background:linear-gradient(110deg,#1B7A8A,#4ABCD4);color:white;box-shadow:0 2px 8px rgba(27,122,138,0.35);}
.sync{font-size:11px;color:var(--t2);display:flex;align-items:center;gap:5px;flex-shrink:0;margin-left:auto;font-weight:500;}
.sync-dot{width:7px;height:7px;border-radius:50%;background:var(--g);box-shadow:0 0 6px rgba(52,211,153,0.6);}
.sync-dot.saving{background:var(--am);animation:pulse 1s infinite;box-shadow:0 0 6px rgba(251,191,36,0.6);}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}

/* ── LAYOUT ───────────────────────────────────────────────── */
.content{flex:1;padding:24px;max-width:1200px;width:100%;margin:0 auto;}
.ptitle{font-size:18px;font-weight:700;color:var(--t1);margin-bottom:3px;letter-spacing:-.2px;}
.psub{font-size:12px;color:var(--t2);margin-bottom:20px;}
.card{position:relative;background:var(--bg1);border:1px solid var(--bdr);border-radius:14px;padding:20px;margin-bottom:16px;overflow:hidden;}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--grad-jn);opacity:0.5;}
.ctitle{font-size:13px;font-weight:700;color:var(--t1);margin-bottom:14px;letter-spacing:-.1px;}

/* ── TABLES ───────────────────────────────────────────────── */
table{width:100%;border-collapse:collapse;font-size:13px;}
th{text-align:left;padding:9px 12px;color:var(--t2);font-weight:600;font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;border-bottom:1px solid var(--bdr);}
td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,0.04);color:var(--t1);vertical-align:middle;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:rgba(255,255,255,0.025);}
.badge{display:inline-block;padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:700;font-family:var(--mono);letter-spacing:.2px;}
.bg{background:rgba(52,211,153,.16);color:#34d399;}
.br{background:rgba(248,113,113,.16);color:#f87171;}
.bam{background:rgba(251,191,36,.16);color:#fbbf24;}

/* ── BUTTONS ──────────────────────────────────────────────── */
.btn{border:none;border-radius:9px;padding:9px 17px;font-size:13px;font-family:'DM Sans';cursor:pointer;font-weight:600;transition:all .15s;-webkit-tap-highlight-color:transparent;}
.btn:active{transform:scale(0.97);}
.bp{background:var(--grad-jn);color:white;box-shadow:0 2px 10px rgba(232,57,42,0.3);}
.bp:hover{filter:brightness(1.08);box-shadow:0 3px 14px rgba(232,57,42,0.4);}
.bgg{background:var(--bg3);color:var(--t2);}
.bgg:hover{color:var(--t1);background:#303034;}
.bok{background:rgba(52,211,153,.16);color:#34d399;}
.bok:hover{background:rgba(52,211,153,.27);}
.bdel{background:rgba(248,113,113,.16);color:#f87171;}
.bdel:hover{background:rgba(248,113,113,.27);}
.bsm{padding:6px 12px;font-size:12px;}
.bblue{background:rgba(74,188,212,.16);color:#4ABCD4;}
.bblue:hover{background:rgba(74,188,212,.27);}

/* ── FORMS ────────────────────────────────────────────────── */
input,select,textarea{background:var(--bg2);border:1px solid var(--bdr);color:var(--t1);padding:9px 12px;border-radius:9px;font-size:13px;font-family:'DM Sans';width:100%;}
input:focus,select:focus,textarea:focus{outline:2px solid var(--r);border-color:transparent;}
input::placeholder{color:var(--t2);}
.fg{display:flex;flex-direction:column;gap:5px;}
.fl{font-size:11px;color:var(--t2);font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}

/* ── STAT CARDS ───────────────────────────────────────────── */
.stat{position:relative;background:var(--bg2);border:1px solid var(--bdr);border-radius:12px;padding:16px;overflow:hidden;}
.stat::after{content:"";position:absolute;right:-20px;top:-20px;width:70px;height:70px;border-radius:50%;background:var(--grad-jn);opacity:0.08;}
.sl{font-size:10.5px;color:var(--t2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;font-weight:600;}
.sv{font-size:20px;font-weight:700;font-family:var(--mono);position:relative;}
.ss{font-size:11px;color:var(--t2);margin-top:3px;}

/* ── MODALS ───────────────────────────────────────────────── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px;backdrop-filter:blur(2px);}
.modal{position:relative;background:var(--bg1);border:1px solid var(--bdr);border-radius:18px;padding:28px;width:500px;max-width:100%;max-height:90vh;overflow-y:auto;}
.modal::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--grad-jn);}
.mtitle{font-size:16px;font-weight:700;margin-bottom:20px;color:var(--t1);}
.mact{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}
.ap{color:var(--g);font-family:var(--mono);font-weight:600;}
.an{color:var(--re);font-family:var(--mono);font-weight:600;}
.am{color:var(--t1);font-family:var(--mono);}

.empty{text-align:center;padding:48px 24px;color:var(--t2);font-size:13px;}
.ei{font-size:32px;margin-bottom:8px;opacity:.3;}
.tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;background:var(--bg3);color:var(--t2);font-weight:500;}
.acts{display:flex;gap:6px;flex-wrap:wrap;}
.dre-calc{background:rgba(232,57,42,0.07);border-top:1px solid rgba(232,57,42,0.2);}
.dre-lbl{padding:9px 12px;font-size:13px;color:var(--t2);align-self:center;}
.dre-lbl-c{color:var(--t1);font-weight:700;}
.dre-val{padding:9px 12px;font-size:13px;font-family:var(--mono);text-align:right;align-self:center;}
.dre-val-c{font-weight:700;font-size:14px;}
.dre-inp{padding:4px 8px;align-self:center;}
.dre-inp input{text-align:right;font-family:var(--mono);font-size:13px;padding:6px 8px;}
.upzone{border:1.5px dashed rgba(232,98,42,0.45);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--grad-jn-soft);}
.upzone:hover{border-color:var(--o);filter:brightness(1.1);}
.info{background:rgba(74,188,212,0.1);border:1px solid rgba(74,188,212,0.2);border-radius:9px;padding:10px 14px;font-size:12px;color:#4ABCD4;margin-bottom:16px;}
.warn{background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:9px;padding:12px 16px;font-size:13px;color:#fbbf24;margin-bottom:16px;}
.ccart{position:relative;background:var(--bg1);border:1px solid var(--bdr);border-radius:14px;padding:20px;margin-bottom:16px;overflow:hidden;}
.ccart::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#4ABCD4,#1B7A8A);opacity:0.5;}
.disc-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--bdr);}
.disc-row:last-child{border-bottom:none;}
.loading{display:flex;align-items:center;justify-content:center;height:100vh;color:var(--t2);font-size:14px;flex-direction:column;gap:12px;}
.installment-tag{display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;background:rgba(74,188,212,.15);color:#4ABCD4;margin-left:6px;font-weight:600;}
.help-box{position:relative;background:var(--grad-jn-soft);border:1px solid var(--bdr);border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:12px;color:var(--t2);line-height:1.6;}
.help-box strong{color:var(--t1);font-weight:600;}
.help-box code{background:var(--bg3);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:11px;color:#4ABCD4;}
.section-divider{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--t2);padding:8px 12px;background:var(--bg2);border-radius:6px;margin-bottom:8px;}

/* ── RESPONSIVE: TABLET ───────────────────────────────────── */
@media (max-width: 900px){
  .content{padding:18px 14px;}
  .g4{grid-template-columns:repeat(2,1fr);gap:10px;}
  .g3{grid-template-columns:1fr 1fr;}
  .g2{gap:10px;}
}

/* ── RESPONSIVE: MOBILE (iPhone etc) ──────────────────────── */
/* Mobile item cards: hidden by default (desktop shows table) */
.mobile-cards{display:none;}
.mobile-item-card{position:relative;background:var(--bg1);border:1px solid var(--bdr);border-radius:13px;padding:14px;margin-bottom:10px;overflow:hidden;}
.mobile-item-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--grad-jn);opacity:0.5;}
.mic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;}
.mic-title{font-size:14px;font-weight:700;color:var(--t1);}
.mic-sub{font-size:11px;color:var(--t2);margin-top:1px;}
.mic-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-bottom:12px;}
.mic-field{display:flex;flex-direction:column;gap:2px;font-size:12.5px;}
.mic-flabel{font-size:9.5px;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;font-weight:600;}
.mic-actions{display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--bdr);padding-top:10px;}
.mic-actions .btn{flex:1;text-align:center;justify-content:center;}

@media (max-width: 640px){
  .topbar{height:auto;min-height:52px;padding:10px 14px;flex-wrap:wrap;gap:8px;}
  .logo{font-size:13px;order:1;}
  .sync{order:2;margin-left:auto;}
  .stabs{order:4;width:100%;}
  .stab{flex:1;text-align:center;}
  .msel{order:3;flex:1;min-width:0;}
  .subnav{top:auto;padding:0 10px;height:40px;}
  .content{padding:14px 10px;}
  .ptitle{font-size:16px;}
  .g4{grid-template-columns:repeat(2,1fr);gap:8px;}
  .g3{grid-template-columns:1fr;gap:8px;}
  .g2{grid-template-columns:1fr;gap:8px;}
  .card,.ccart{padding:14px;border-radius:12px;}
  .stat{padding:12px;}
  .sv{font-size:17px;}
  .modal{padding:18px;border-radius:14px;}
  .btn{padding:8px 13px;font-size:12.5px;}
  /* On mobile: hide desktop table, show stacked cards instead */
  .desktop-table{display:none;}
  .mobile-cards{display:block;}
}
@media (max-width: 380px){
  .stabs .stab{padding:5px 8px;font-size:11px;}
  .nb{padding:6px 10px;font-size:11px;}
}
`;

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
const CT=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return <div style={{background:"#1e1e1e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",fontSize:12}}>
    <div style={{color:"#999",marginBottom:6}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color,marginBottom:3}}>{p.name}: {fmtK(p.value)}</div>)}
  </div>;
};

// ─── MONTH ROLLOVER BANNER ────────────────────────────────────────────────────
function RolloverBanner({month,year}) {
  const [dismissed,setDismissed]=useState(false);
  const currentMonth=today.getMonth();
  const currentYear=today.getFullYear();
  // Show banner if viewing current month and it just changed (day 1-3)
  const isCurrentMonth=month===currentMonth&&year===currentYear;
  const dayOfMonth=today.getDate();
  if(!isCurrentMonth||dayOfMonth>5||dismissed) return null;
  const prevMonth=currentMonth===0?11:currentMonth-1;
  const prevYear=currentMonth===0?currentYear-1:currentYear;
  return (
    <div className="warn" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <strong>📅 We're now in {MONTHS_EN[currentMonth]}!</strong> — Don't forget to import the final Jobber reports for {MONTHS_EN[prevMonth]} {prevYear}.
        Go to the <strong>DRE tab</strong> and upload both CSVs for last month.
      </div>
      <button className="btn bgg bsm" onClick={()=>setDismissed(true)} style={{marginLeft:12,flex:"none"}}>Dismiss</button>
    </div>
  );
}


// ─── ACCOUNTING BASIS NOTICE ─────────────────────────────────────────────────
function BasisNotice({type}) {
  const msgs = {
    dre: "📊 DRE shows business performance (accrual basis). A month can show profit while cash is tight.",
    cashflow: "💵 Cash Flow shows actual money in the bank. This is NOT the same as profit — they move independently.",
    analytics: "📈 Analytics uses DRE data (accrual). Always cross-check with Cash Flow before making spending decisions.",
  };
  return <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:"8px 14px",fontSize:11,color:"#777",marginBottom:16,letterSpacing:".1px"}}>{msgs[type]}</div>;
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function ModalReceivable({onSave,onClose,month,year}) {
  const [f,setF]=useState({client:"",job:"",total:"",deposited:"",billedDate:"",dueDate:"",notes:"",massSave:false,installments:1});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const rem=Math.max(0,fmtNum(f.total)-fmtNum(f.deposited));
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="mtitle">New Receivable</div>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="fg"><div className="fl">Client Name</div><input value={f.client} onChange={e=>s("client",e.target.value)} placeholder="Client name"/></div>
      <div className="fg"><div className="fl">Job Description</div><input value={f.job} onChange={e=>s("job",e.target.value)} placeholder="e.g. HVAC installation or Invoice #1234"/></div>
      <div className="g2">
        <div className="fg"><div className="fl">Invoice Date</div><input type="date" value={f.billedDate} onChange={e=>s("billedDate",e.target.value)}/></div>
        <div className="fg"><div className="fl">Payment Due Date</div><input type="date" value={f.dueDate} onChange={e=>s("dueDate",e.target.value)}/></div>
      </div>
      <div className="g2">
        <div className="fg"><div className="fl">Total Amount ($)</div><input type="number" value={f.total} onChange={e=>s("total",e.target.value)} placeholder="0.00"/></div>
        <div className="fg"><div className="fl">Already Deposited ($)</div><input type="number" value={f.deposited} onChange={e=>s("deposited",e.target.value)} placeholder="0.00"/></div>
      </div>
      <div className="fg">
        <div className="fl">Split into how many months?</div>
        <select value={f.installments} onChange={e=>s("installments",Number(e.target.value))}>
          {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n===1?"Single payment":n+" monthly installments"}</option>)}
        </select>
      </div>
      {f.installments>1&&rem>0&&<div className="info">{f.installments} installments of {fmt(rem/f.installments)} — one per month starting {MONTHS_EN[month]} {year}</div>}
      <div style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" id="ms" checked={f.massSave} onChange={e=>s("massSave",e.target.checked)} style={{width:"auto"}}/><label htmlFor="ms" style={{fontSize:13,color:"var(--t2)",cursor:"pointer"}}>Mass Save</label></div>
      <div className="fg"><div className="fl">Notes</div><textarea rows={2} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Optional notes..."/></div>
    </div>
    <div className="mact">
      <button className="btn bgg" onClick={onClose}>Cancel</button>
      <button className="btn bp" onClick={()=>{
        if(!f.client) return;
        const groupId=Date.now().toString();const n=f.installments||1;
        for(let i=0;i<n;i++){
          let m=month+i;let y=year;if(m>11){m=m-12;y+=1;}
          const instRem=Math.round(rem/n*100)/100;
          let dd=f.dueDate;
          if(f.dueDate&&i>0){try{const d=parseLocalDate(f.dueDate);d.setMonth(d.getMonth()+i);dd=d.toISOString().split("T")[0];}catch(e){}}
          onSave({...f,id:Date.now().toString()+i,groupId:n>1?groupId:null,installmentNum:n>1?i+1:null,totalInstallments:n>1?n:null,total:n>1?(i===0?fmtNum(f.total):instRem):fmtNum(f.total),deposited:i===0?fmtNum(f.deposited):0,remaining:instRem,dueDate:dd,status:instRem<=0?"paid":"pending",createdAt:new Date(y,m).toISOString()});
        }
        onClose();
      }}>Save</button>
    </div>
  </div></div>;
}

function ModalContractor({onSave,onClose,month,year}) {
  const [f,setF]=useState({name:"",job:"",amount:"",dueDate:"",notes:"",installments:1});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="mtitle">Subcontractor Payment</div>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="fg"><div className="fl">Subcontractor Name</div><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. John Silva"/></div>
      <div className="fg"><div className="fl">Job / Description</div><input value={f.job} onChange={e=>s("job",e.target.value)} placeholder="e.g. HVAC install - Boston"/></div>
      <div className="g2">
        <div className="fg"><div className="fl">Total Amount ($)</div><input type="number" value={f.amount} onChange={e=>s("amount",e.target.value)} placeholder="0.00"/></div>
        <div className="fg"><div className="fl">Payment Date</div><input type="date" value={f.dueDate} onChange={e=>s("dueDate",e.target.value)}/></div>
      </div>
      <div className="fg">
        <div className="fl">Split into how many months?</div>
        <select value={f.installments} onChange={e=>s("installments",Number(e.target.value))}>
          {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n===1?"Single payment":n+" monthly installments"}</option>)}
        </select>
      </div>
      <div className="fg"><div className="fl">Notes</div><textarea rows={2} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Optional notes..."/></div>
    </div>
    <div className="mact">
      <button className="btn bgg" onClick={onClose}>Cancel</button>
      <button className="btn bp" onClick={()=>{
        if(!f.name||!f.amount) return;
        const n=f.installments||1;const groupId=Date.now().toString();
        for(let i=0;i<n;i++){
          let m=month+i;let y=year;if(m>11){m=m-12;y+=1;}
          const amt=Math.round(fmtNum(f.amount)/n*100)/100;
          let dd=f.dueDate;
          if(f.dueDate&&i>0){try{const d=parseLocalDate(f.dueDate);d.setMonth(d.getMonth()+i);dd=d.toISOString().split("T")[0];}catch(e){}}
          onSave({...f,id:Date.now().toString()+i,groupId:n>1?groupId:null,installmentNum:n>1?i+1:null,totalInstallments:n>1?n:null,amount:amt,dueDate:dd,status:"pending",createdAt:new Date(y,m).toISOString()});
        }
        onClose();
      }}>Save</button>
    </div>
  </div></div>;
}

function ModalPayable({onSave,onClose,month,year}) {
  const [f,setF]=useState({description:"",vendor:"",amount:"",dueDate:"",category:"custos_fixos",notes:"",installments:1});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="mtitle">New Payable</div>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="fg"><div className="fl">Description</div><input value={f.description} onChange={e=>s("description",e.target.value)} placeholder="e.g. Office Rent"/></div>
      <div className="fg"><div className="fl">Vendor</div><input value={f.vendor} onChange={e=>s("vendor",e.target.value)} placeholder="e.g. WeWork"/></div>
      <div className="g2">
        <div className="fg"><div className="fl">Amount ($)</div><input type="number" value={f.amount} onChange={e=>s("amount",e.target.value)} placeholder="0.00"/></div>
        <div className="fg"><div className="fl">Due Date</div><input type="date" value={f.dueDate} onChange={e=>s("dueDate",e.target.value)}/></div>
      </div>
      <div className="fg"><div className="fl">Category</div>
        <select value={f.category} onChange={e=>s("category",e.target.value)}>
          {Object.entries(DRE_LABELS).filter(([k])=>!["receita_liquida","margem","lucro_op","lucro_ir","rev_operacional","rev_genn","impostos"].includes(k)).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="fg">
        <div className="fl">Repeat for how many months?</div>
        <select value={f.installments} onChange={e=>s("installments",Number(e.target.value))}>
          {[1,2,3,4,5,6,12].map(n=><option key={n} value={n}>{n===1?"This month only":n===12?"12 months (1 year)":n+" months"}</option>)}
        </select>
      </div>
      <div className="fg"><div className="fl">Notes</div><textarea rows={2} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Optional notes..."/></div>
    </div>
    <div className="mact">
      <button className="btn bgg" onClick={onClose}>Cancel</button>
      <button className="btn bp" onClick={()=>{
        if(!f.description||!f.amount) return;
        const n=f.installments||1;const groupId=Date.now().toString();
        for(let i=0;i<n;i++){
          let m=month+i;let y=year;if(m>11){m=m-12;y+=1;}
          let dd=f.dueDate;
          if(f.dueDate&&i>0){try{const d=parseLocalDate(f.dueDate);d.setMonth(d.getMonth()+i);dd=d.toISOString().split("T")[0];}catch(e){}}
          onSave({...f,id:Date.now().toString()+i,groupId:n>1?groupId:null,installmentNum:n>1?i+1:null,totalInstallments:n>1?n:null,amount:fmtNum(f.amount),dueDate:dd,status:"pending",createdAt:new Date(y,m).toISOString()});
        }
        onClose();
      }}>Save</button>
    </div>
  </div></div>;
}


// ─── MODAL EDIT RECEIVABLE ────────────────────────────────────────────────────
function ModalEditReceivable({item,onSave,onClose}) {
  const [f,setF]=useState({...item});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const rem=Math.max(0,fmtNum(f.total)-fmtNum(f.deposited));
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="mtitle">Edit Receivable — {item.client}</div>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="fg"><div className="fl">Client Name</div><input value={f.client} onChange={e=>s("client",e.target.value)}/></div>
      <div className="fg"><div className="fl">Job / Invoice #</div><input value={f.job||""} onChange={e=>s("job",e.target.value)} placeholder="e.g. HVAC installation or Invoice #1234"/></div>
      <div className="g2">
        <div className="fg"><div className="fl">Invoice Date</div><input type="date" value={f.billedDate||""} onChange={e=>s("billedDate",e.target.value)}/></div>
        <div className="fg"><div className="fl">Payment Due Date</div><input type="date" value={f.dueDate||""} onChange={e=>s("dueDate",e.target.value)}/></div>
      </div>
      <div className="g2">
        <div className="fg"><div className="fl">Total Amount ($)</div><input type="number" value={f.total} onChange={e=>s("total",e.target.value)}/></div>
        <div className="fg"><div className="fl">Already Deposited ($)</div><input type="number" value={f.deposited} onChange={e=>s("deposited",e.target.value)}/></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" id="mse" checked={f.massSave||false} onChange={e=>s("massSave",e.target.checked)} style={{width:"auto"}}/><label htmlFor="mse" style={{fontSize:13,color:"var(--t2)",cursor:"pointer"}}>Mass Save</label></div>
      <div className="fg"><div className="fl">Status</div>
        <select value={f.status} onChange={e=>s("status",e.target.value)}>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      <div className="fg"><div className="fl">Notes</div><textarea rows={2} value={f.notes||""} onChange={e=>s("notes",e.target.value)}/></div>
      <div style={{background:"rgba(74,188,212,0.1)",border:"1px solid rgba(74,188,212,0.2)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#4ABCD4"}}>Balance: {fmt(rem)}</div>
    </div>
    <div className="mact">
      <button className="btn bgg" onClick={onClose}>Cancel</button>
      <button className="btn bp" onClick={()=>{onSave({...f,remaining:rem,status:rem<=0?"paid":f.status});onClose();}}>Save Changes</button>
    </div>
  </div></div>;
}

// ─── RECEIVABLES TAB ──────────────────────────────────────────────────────────

// ─── MOBILE CARD ROW (used for narrow screens) ────────────────────────────────
function MobileItemCard({title,subtitle,tag,fields,statusLabel,statusClass,actions}) {
  return <div className="mobile-item-card">
    <div className="mic-head">
      <div>
        <div className="mic-title">{title}</div>
        {subtitle&&<div className="mic-sub">{subtitle}</div>}
        {tag}
      </div>
      <span className={`badge ${statusClass}`}>{statusLabel}</span>
    </div>
    <div className="mic-fields">
      {fields.map((f,i)=><div key={i} className="mic-field"><span className="mic-flabel">{f.label}</span><span className={f.cls||""} style={f.style}>{f.value}</span></div>)}
    </div>
    <div className="mic-actions">{actions}</div>
  </div>;
}

function ReceivablesTab({data,setData,month,year}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [filter,setFilter]=useState("all");
  const items=useMemo(()=>(data.receivables||[]).filter(r=>{
    const d=parseLocalDate(r.createdAt||r.dueDate)||new Date();
    if(d.getMonth()!==month||d.getFullYear()!==year) return false;
    if(filter==="pending") return r.status!=="paid";
    if(filter==="paid") return r.status==="paid";
    if(filter==="masssave") return r.massSave;
    return true;
  }),[data.receivables,month,year,filter]);
  const totalSold=items.reduce((s,r)=>s+fmtNum(r.total),0);
  const totalDep=items.reduce((s,r)=>s+fmtNum(r.deposited),0);
  const totalRem=items.reduce((s,r)=>s+fmtNum(r.remaining),0);
  const overdue=items.filter(r=>r.status!=="paid"&&agingDays(r.dueDate)>0).length;
  const markPaid=id=>setData(d=>({...d,receivables:d.receivables.map(r=>r.id===id?{...r,status:"paid",deposited:r.total,remaining:0}:r)}));
  const del=id=>{if(!window.confirm("Are you sure you want to delete this receivable? This cannot be undone.")) return;
    // Mark historical items as deleted in Firebase too
    if(id.startsWith("hist_")) fbSet("receivables",id,{id,_deleted:true});
    setData(d=>({...d,receivables:d.receivables.filter(r=>r.id!==id)}));
  };
  const add=item=>setData(d=>({...d,receivables:[...(d.receivables||[]),item]}));
  const update=item=>{fbSet("receivables",item.id,item);setData(d=>({...d,receivables:d.receivables.map(r=>r.id===item.id?{...r,...item}:r)}));};
  return <div>
    <div className="help-box">
      <strong>📋 Receivables — How to use:</strong><br/>
      Add a new entry for each job that was invoiced. Fill in the client name, job description, invoice date, due date, total amount, and how much has already been deposited. The balance is calculated automatically.<br/>
      — When a client pays, click <strong>✓</strong> to mark it as paid — it will be removed from the Cash Flow projection.<br/>
      — Use <strong>Mass Save</strong> for jobs that include a Mass Save incentive program.<br/>
      — You can split a payment into multiple months using the installment option.
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div className="ptitle">Receivables</div>
      <button className="btn bp" onClick={()=>setShowAdd(true)}>+ New</button>
    </div>
    <div className="psub">{MONTHS_EN[month]} {year}</div>
    <div className="g4">
      <div className="stat"><div className="sl">Total Invoiced</div><div className="sv" style={{color:C.blue}}>{fmt(totalSold)}</div></div>
      <div className="stat"><div className="sl">Received</div><div className="sv" style={{color:C.green}}>{fmt(totalDep)}</div></div>
      <div className="stat"><div className="sl">Outstanding</div><div className="sv" style={{color:C.amber}}>{fmt(totalRem)}</div></div>
      <div className="stat"><div className="sl">Overdue</div><div className="sv" style={{color:overdue>0?C.red:C.text2}}>{overdue}</div><div className="ss">clients</div></div>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {["all","pending","paid","masssave"].map(f=><button key={f} className={`btn bsm ${filter===f?"bp":"bgg"}`} onClick={()=>setFilter(f)}>{f==="all"?"All":f==="pending"?"Pending":f==="paid"?"Paid":"Mass Save"}</button>)}
    </div>
    {items.length===0?<div className="card empty"><div className="ei">📋</div>No receivables this month</div>:(<>
      <div className="card desktop-table" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Client</th><th>Job / Invoice #</th><th>Invoice Date</th><th>Total</th><th>Deposited</th><th>Balance</th><th>Aging</th><th>Status</th><th></th></tr></thead>
          <tbody>{items.map(r=>{const ag=agingLabel(agingDays(r.dueDate));return <tr key={r.id}>
            <td><div style={{fontWeight:500}}>{r.client}{r.totalInstallments>1&&<span className="installment-tag">{r.installmentNum}/{r.totalInstallments}</span>}</div>{r.massSave&&<span className="tag" style={{marginTop:2}}>Mass Save</span>}</td>
            <td style={{color:C.text2,maxWidth:140}}>{r.job}</td>
            <td style={{color:C.text2,fontSize:12,fontFamily:"var(--mono)"}}>{r.billedDate||"—"}</td>
            <td><span className="am">{fmt(r.total)}</span></td>
            <td><span className="ap">{fmt(r.deposited)}</span></td>
            <td><span className={fmtNum(r.remaining)>0?"an":"ap"}>{fmt(r.remaining)}</span></td>
            <td><span style={{fontSize:12,color:ag.color,fontFamily:"var(--mono)"}}>{r.status==="paid"?"—":r.dueDate?ag.label:"—"}</span></td>
            <td><span className={`badge ${r.status==="paid"?"bg":"bam"}`}>{r.status==="paid"?"Paid":"Pending"}</span></td>
            <td><div className="acts">{r.status!=="paid"&&<button className="btn bsm bok" onClick={()=>markPaid(r.id)}>✓</button>}<button className="btn bsm bgg" onClick={()=>setEditItem(r)} style={{fontSize:11}}>✎</button><button className="btn bsm bdel" onClick={()=>del(r.id)}>✕</button></div></td>
          </tr>;})}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {items.map(r=>{const ag=agingLabel(agingDays(r.dueDate));return <MobileItemCard key={r.id}
          title={r.client}
          tag={r.massSave&&<span className="tag" style={{marginTop:4}}>Mass Save</span>}
          statusLabel={r.status==="paid"?"Paid":"Pending"}
          statusClass={r.status==="paid"?"bg":"bam"}
          fields={[
            {label:"Job/Invoice",value:r.job||"—"},
            {label:"Invoice Date",value:r.billedDate||"—"},
            {label:"Total",value:fmt(r.total),cls:"am"},
            {label:"Deposited",value:fmt(r.deposited),cls:"ap"},
            {label:"Balance",value:fmt(r.remaining),cls:fmtNum(r.remaining)>0?"an":"ap"},
            {label:"Aging",value:r.status==="paid"?"—":r.dueDate?ag.label:"—",style:{color:ag.color,fontFamily:"var(--mono)",fontSize:12}},
          ]}
          actions={<>{r.status!=="paid"&&<button className="btn bsm bok" onClick={()=>markPaid(r.id)}>✓ Paid</button>}<button className="btn bsm bgg" onClick={()=>setEditItem(r)}>✎ Edit</button><button className="btn bsm bdel" onClick={()=>del(r.id)}>✕ Delete</button></>}
        />;})}
      </div>
    </>)}
    {showAdd&&<ModalReceivable onSave={add} onClose={()=>setShowAdd(false)} month={month} year={year}/>}
    {editItem&&<ModalEditReceivable item={editItem} onSave={item=>{update(item);setEditItem(null);}} onClose={()=>setEditItem(null)}/>}
  </div>;
}

// ─── CONTRACTORS TAB ──────────────────────────────────────────────────────────
function ContractorsTab({data,setData,month,year}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const items=useMemo(()=>(data.contractors||[]).filter(r=>{const d=parseLocalDate(r.createdAt||r.dueDate)||new Date();return d.getMonth()===month&&d.getFullYear()===year;}),[data.contractors,month,year]);
  const pending=items.filter(i=>i.status!=="paid").reduce((s,i)=>s+fmtNum(i.amount),0);
  const paid=items.filter(i=>i.status==="paid").reduce((s,i)=>s+fmtNum(i.amount),0);
  const overdue=items.filter(i=>i.status!=="paid"&&agingDays(i.dueDate)>0).length;
  const markPaid=id=>setData(d=>({...d,contractors:d.contractors.map(c=>c.id===id?{...c,status:"paid",paidAt:new Date().toISOString()}:c)}));
  const del=id=>{if(!window.confirm("Are you sure you want to delete this payment?")) return;setData(d=>({...d,contractors:d.contractors.filter(c=>c.id!==id)}));};
  const add=item=>setData(d=>({...d,contractors:[...(d.contractors||[]),item]}));
  const update=item=>{fbSet("contractors",item.id,item);setData(d=>({...d,contractors:d.contractors.map(c=>c.id===item.id?{...c,...item}:c)}));};
  return <div>
    <div className="help-box">
      <strong>🔧 Subcontractors — How to use:</strong><br/>
      Add subcontractor payments as Junior sends them via WhatsApp. Fill in the name, job, total amount, and the date the payment should be made.<br/>
      — When payment is made, click <strong>✓ Paid</strong> — it will be removed from the Cash Flow projection.<br/>
      — Use the installment option if the payment is split across multiple months.
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div className="ptitle">Subcontractors</div>
      <button className="btn bp" onClick={()=>setShowAdd(true)}>+ New</button>
    </div>
    <div className="psub">{MONTHS_EN[month]} {year}</div>
    <div className="g4">
      <div className="stat"><div className="sl">To Pay</div><div className="sv" style={{color:C.red}}>{fmt(pending)}</div></div>
      <div className="stat"><div className="sl">Paid</div><div className="sv" style={{color:C.green}}>{fmt(paid)}</div></div>
      <div className="stat"><div className="sl">Month Total</div><div className="sv" style={{color:C.blue}}>{fmt(pending+paid)}</div></div>
      <div className="stat"><div className="sl">Overdue</div><div className="sv" style={{color:overdue>0?C.red:C.text2}}>{overdue}</div><div className="ss">unpaid</div></div>
    </div>
    {items.length===0?<div className="card empty"><div className="ei">🔧</div>No payments this month</div>:(<>
      <div className="card desktop-table" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Subcontractor</th><th>Job / Invoice #</th><th>Amount</th><th>Date</th><th>Aging</th><th>Status</th><th></th></tr></thead>
          <tbody>{items.sort((a,b)=>a.status==="paid"?1:-1).map(c=>{const ag=agingLabel(agingDays(c.dueDate));return <tr key={c.id}>
            <td style={{fontWeight:500}}>{c.name}{c.totalInstallments>1&&<span className="installment-tag">{c.installmentNum}/{c.totalInstallments}</span>}</td>
            <td style={{color:C.text2}}>{c.job}</td>
            <td><span className="am">{fmt(c.amount)}</span></td>
            <td style={{color:C.text2,fontSize:12}}>{c.dueDate||"—"}</td>
            <td><span style={{fontSize:12,color:ag.color,fontFamily:"var(--mono)"}}>{c.status==="paid"?"—":c.dueDate?ag.label:"—"}</span></td>
            <td><span className={`badge ${c.status==="paid"?"bg":"br"}`}>{c.status==="paid"?"Paid":"Pending"}</span></td>
            <td><div className="acts">{c.status!=="paid"&&<button className="btn bsm bok" onClick={()=>markPaid(c.id)}>✓ Paid</button>}<button className="btn bsm bgg" onClick={()=>setEditItem(c)} style={{fontSize:11}}>✎</button><button className="btn bsm bdel" onClick={()=>del(c.id)}>✕</button></div></td>
          </tr>;})}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {items.sort((a,b)=>a.status==="paid"?1:-1).map(c=>{const ag=agingLabel(agingDays(c.dueDate));return <MobileItemCard key={c.id}
          title={c.name}
          statusLabel={c.status==="paid"?"Paid":"Pending"}
          statusClass={c.status==="paid"?"bg":"br"}
          fields={[
            {label:"Job/Invoice",value:c.job||"—"},
            {label:"Amount",value:fmt(c.amount),cls:"am"},
            {label:"Date",value:c.dueDate||"—"},
            {label:"Aging",value:c.status==="paid"?"—":c.dueDate?ag.label:"—",style:{color:ag.color,fontFamily:"var(--mono)",fontSize:12}},
          ]}
          actions={<>{c.status!=="paid"&&<button className="btn bsm bok" onClick={()=>markPaid(c.id)}>✓ Paid</button>}<button className="btn bsm bgg" onClick={()=>setEditItem(c)}>✎ Edit</button><button className="btn bsm bdel" onClick={()=>del(c.id)}>✕ Delete</button></>}
        />;})}
      </div>
    </>)}
    {showAdd&&<ModalContractor onSave={add} onClose={()=>setShowAdd(false)} month={month} year={year}/>}
    {editItem&&<div className="overlay" onClick={()=>setEditItem(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="mtitle">Edit — {editItem.name}</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="fg"><div className="fl">Name</div><input value={editItem.name} onChange={e=>setEditItem(p=>({...p,name:e.target.value}))}/></div>
        <div className="fg"><div className="fl">Job</div><input value={editItem.job||""} onChange={e=>setEditItem(p=>({...p,job:e.target.value}))}/></div>
        <div className="g2">
          <div className="fg"><div className="fl">Amount ($)</div><input type="number" value={editItem.amount} onChange={e=>setEditItem(p=>({...p,amount:e.target.value}))}/></div>
          <div className="fg"><div className="fl">Payment Date</div><input type="date" value={editItem.dueDate||""} onChange={e=>setEditItem(p=>({...p,dueDate:e.target.value}))}/></div>
        </div>
        <div className="fg"><div className="fl">Status</div><select value={editItem.status} onChange={e=>setEditItem(p=>({...p,status:e.target.value}))}><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fg"><div className="fl">Notes</div><textarea rows={2} value={editItem.notes||""} onChange={e=>setEditItem(p=>({...p,notes:e.target.value}))}/></div>
      </div>
      <div className="mact"><button className="btn bgg" onClick={()=>setEditItem(null)}>Cancel</button><button className="btn bp" onClick={()=>{update(editItem);setEditItem(null);}}>Save Changes</button></div>
    </div></div>}
  </div>;
}

// ─── PAYABLES TAB ─────────────────────────────────────────────────────────────
function PayablesTab({data,setData,month,year}) {
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const items=useMemo(()=>(data.payables||[]).filter(r=>{const d=parseLocalDate(r.createdAt||r.dueDate)||new Date();return d.getMonth()===month&&d.getFullYear()===year;}),[data.payables,month,year]);
  const pending=items.filter(i=>i.status!=="paid").reduce((s,i)=>s+fmtNum(i.amount),0);
  const paid=items.filter(i=>i.status==="paid").reduce((s,i)=>s+fmtNum(i.amount),0);
  const overdue=items.filter(i=>i.status!=="paid"&&agingDays(i.dueDate)>0).length;
  const markPaid=id=>setData(d=>({...d,payables:d.payables.map(p=>p.id===id?{...p,status:"paid",paidAt:new Date().toISOString()}:p)}));
  const del=id=>{if(!window.confirm("Are you sure you want to delete this payable?")) return;setData(d=>({...d,payables:d.payables.filter(p=>p.id!==id)}));};
  const add=item=>setData(d=>({...d,payables:[...(d.payables||[]),item]}));
  const update=item=>{fbSet("payables",item.id,item);setData(d=>({...d,payables:d.payables.map(p=>p.id===item.id?{...p,...item}:p)}));};
  return <div>
    <div className="help-box">
      <strong>🧾 Payables — How to use:</strong><br/>
      Add all expenses and bills that need to be paid this month. Fill in the description, vendor, amount, due date, and category.<br/>
      — When payment is made, click <strong>✓ Paid</strong> — it will be removed from the Cash Flow projection.<br/>
      — Use <strong>Repeat for X months</strong> for recurring expenses like rent, insurance, or subscriptions.<br/>
      — The category you select here links to the DRE but does not automatically update it — the DRE is populated by Jobber CSV imports.
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div className="ptitle">Payables</div>
      <button className="btn bp" onClick={()=>setShowAdd(true)}>+ New</button>
    </div>
    <div className="psub">{MONTHS_EN[month]} {year}</div>
    <div className="g4">
      <div className="stat"><div className="sl">To Pay</div><div className="sv" style={{color:C.red}}>{fmt(pending)}</div></div>
      <div className="stat"><div className="sl">Paid</div><div className="sv" style={{color:C.green}}>{fmt(paid)}</div></div>
      <div className="stat"><div className="sl">Month Total</div><div className="sv" style={{color:C.blue}}>{fmt(pending+paid)}</div></div>
      <div className="stat"><div className="sl">Overdue</div><div className="sv" style={{color:overdue>0?C.red:C.text2}}>{overdue}</div><div className="ss">unpaid</div></div>
    </div>
    {items.length===0?<div className="card empty"><div className="ei">🧾</div>No payables this month</div>:(<>
      <div className="card desktop-table" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Description</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Due Date</th><th>Aging</th><th>Status</th><th></th></tr></thead>
          <tbody>{items.sort((a,b)=>a.status==="paid"?1:-1).map(p=>{const ag=p.status==="paid"?{label:"Paid",color:C.green}:agingLabel(agingDays(p.dueDate));return <tr key={p.id} style={{opacity:p.status==="paid"?0.6:1}}>
            <td style={{fontWeight:500}}>{p.description}{p.totalInstallments>1&&<span className="installment-tag">{p.installmentNum}/{p.totalInstallments}</span>}</td>
            <td style={{color:C.text2}}>{p.vendor||"—"}</td>
            <td><span className="tag">{DRE_LABELS[p.category]?.split(" ").slice(0,2).join(" ")||p.category}</span></td>
            <td><span className="am">{fmt(p.amount)}</span></td>
            <td style={{color:C.text2,fontSize:12,fontFamily:"var(--mono)"}}>{p.dueDate||"—"}</td>
            <td><span style={{fontSize:12,color:ag.color,fontFamily:"var(--mono)"}}>{p.status==="paid"?"—":p.dueDate?ag.label:"—"}</span></td>
            <td><span className={`badge ${p.status==="paid"?"bg":"br"}`}>{p.status==="paid"?"Paid":"Pending"}</span></td>
            <td><div className="acts">{p.status!=="paid"&&<button className="btn bsm bok" onClick={()=>markPaid(p.id)}>✓ Paid</button>}<button className="btn bsm bgg" onClick={()=>setEditItem(p)} style={{fontSize:11}}>✎</button><button className="btn bsm bdel" onClick={()=>del(p.id)}>✕</button></div></td>
          </tr>;})}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {items.sort((a,b)=>a.status==="paid"?1:-1).map(p=>{const ag=p.status==="paid"?{label:"Paid",color:C.green}:agingLabel(agingDays(p.dueDate));return <MobileItemCard key={p.id}
          title={p.description}
          statusLabel={p.status==="paid"?"Paid":"Pending"}
          statusClass={p.status==="paid"?"bg":"br"}
          fields={[
            {label:"Vendor",value:p.vendor||"—"},
            {label:"Category",value:DRE_LABELS[p.category]?.split(" ").slice(0,2).join(" ")||p.category},
            {label:"Amount",value:fmt(p.amount),cls:"am"},
            {label:"Due Date",value:p.dueDate||"—"},
            {label:"Aging",value:p.status==="paid"?"—":p.dueDate?ag.label:"—",style:{color:ag.color,fontFamily:"var(--mono)",fontSize:12}},
          ]}
          actions={<>{p.status!=="paid"&&<button className="btn bsm bok" onClick={()=>markPaid(p.id)}>✓ Paid</button>}<button className="btn bsm bgg" onClick={()=>setEditItem(p)}>✎ Edit</button><button className="btn bsm bdel" onClick={()=>del(p.id)}>✕ Delete</button></>}
        />;})}
      </div>
    </>)}
    {showAdd&&<ModalPayable onSave={add} onClose={()=>setShowAdd(false)} month={month} year={year}/>}
    {editItem&&<div className="overlay" onClick={()=>setEditItem(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="mtitle">Edit — {editItem.description}</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div className="fg"><div className="fl">Description</div><input value={editItem.description} onChange={e=>setEditItem(p=>({...p,description:e.target.value}))}/></div>
        <div className="fg"><div className="fl">Vendor</div><input value={editItem.vendor||""} onChange={e=>setEditItem(p=>({...p,vendor:e.target.value}))}/></div>
        <div className="g2">
          <div className="fg"><div className="fl">Amount ($)</div><input type="number" value={editItem.amount} onChange={e=>setEditItem(p=>({...p,amount:Number(e.target.value)}))}/></div>
          <div className="fg"><div className="fl">Due Date</div><input type="date" value={editItem.dueDate||""} onChange={e=>setEditItem(p=>({...p,dueDate:e.target.value}))}/></div>
        </div>
        <div className="fg"><div className="fl">Category</div>
          <select value={editItem.category||"custos_fixos"} onChange={e=>setEditItem(p=>({...p,category:e.target.value}))}>
            {Object.entries(DRE_LABELS).filter(([k])=>!["receita_liquida","margem","lucro_op","lucro_ir","rev_operacional","rev_genn","impostos"].includes(k)).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="fg"><div className="fl">Status</div><select value={editItem.status} onChange={e=>setEditItem(p=>({...p,status:e.target.value}))}><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
        <div className="fg"><div className="fl">Notes</div><textarea rows={2} value={editItem.notes||""} onChange={e=>setEditItem(p=>({...p,notes:e.target.value}))}/></div>
      </div>
      <div className="mact"><button className="btn bgg" onClick={()=>setEditItem(null)}>Cancel</button><button className="btn bp" onClick={()=>{update(editItem);setEditItem(null);}}>Save Changes</button></div>
    </div></div>}
  </div>;
}

// ─── DRE TAB ──────────────────────────────────────────────────────────────────
function DRETab({data,setData,month,year}) {
  const [mode,setMode]=useState("realizada");
  const mk=`${year}-${month}`;
  // Base: user data or historical fallback
  const baseData=data.dreData?.[mk]||(HIST_R[mk]?{...HIST_R[mk]}:{})||{};
  // Manual adjustments (survive CSV re-imports)
  const adjData=data.dreAdj?.[mk]||{};
  // Eco extra adjustments
  const dreEco=data.dreEcoExtra?.[mk]||(HIST_E[mk]?Object.fromEntries(DRE_INPUT_KEYS.map(k=>[k,Math.max(0,(HIST_E[mk]?.[k]||0)-(HIST_R[mk]?.[k]||0))])):{})||{};
  const [msg,setMsg]=useState("");

  const setV=(k,v)=>setData(d=>({...d,dreData:{...(d.dreData||{}),[mk]:{...(d.dreData?.[mk]||baseData),[k]:v}}}));
  const setAdj=(k,v)=>setData(d=>({...d,dreAdj:{...(d.dreAdj||{}),[mk]:{...(d.dreAdj?.[mk]||{}),[k]:v}}}));
  const setE=(k,v)=>setData(d=>({...d,dreEcoExtra:{...(d.dreEcoExtra||{}),[mk]:{...(d.dreEcoExtra?.[mk]||dreEco),[k]:v}}}));

  // Compute realized with adjustments
  const realizedRaw={...baseData};
  DRE_INPUT_KEYS.forEach(k=>{realizedRaw[k]=fmtNum(baseData[k])+fmtNum(adjData[k]);});
  const realized=computeDRE(realizedRaw);

  // Compute economic
  const ecoIn={...realizedRaw};
  DRE_INPUT_KEYS.forEach(k=>{ecoIn[k]=fmtNum(realizedRaw[k])+fmtNum(dreEco[k]);});
  const economic=computeDRE(ecoIn);

  const upload=(e,type)=>{
    const file=e.target.files?.[0];if(!file) return;
    const r=new FileReader();
    r.onload=ev=>{
      const text=ev.target.result;
      const result=type==="exp"?parseExpenses(text):parsePayments(text);
      const {totals,daily}=result;
      // CSV data goes to dreData (base), manual adjustments in dreAdj survive
      const merged={...(data.dreData?.[mk]||baseData),...totals};
      const existingDaily=(data.cashFlowDaily||{})[mk]||[];
      const otherDaily=existingDaily.filter(d=>d.sourceType!==(type==="exp"?"exp":"pay"));
      const newDaily=[...otherDaily,...daily];
      setData(d=>({...d,dreData:{...(d.dreData||{}),[mk]:merged},cashFlowDaily:{...(d.cashFlowDaily||{}),[mk]:newDaily}}));
      const ok=Object.keys(totals).filter(k=>!k.startsWith("_u_")).length;
      const bad=Object.keys(totals).filter(k=>k.startsWith("_u_")).map(k=>k.replace("_u_","")).join(", ");
      setMsg(bad?`✓ ${ok} categories imported — ⚠️ unmapped: ${bad}`:`✓ ${ok} categories imported`);
      setTimeout(()=>setMsg(""),5000);
    };
    r.readAsText(file);e.target.value="";
  };

  const cols3="1fr 120px 80px 120px";
  const cols2="1fr 120px 120px";
  const cols1="1fr 120px";

  return <div>
    <BasisNotice type="dre"/>
    <div className="help-box">
      <strong>📊 DRE — How to use:</strong><br/>
      <strong>How to download CSVs from Jobber:</strong><br/>
      — Payments: <code>Jobber → Reports → Financial Reports (Transaction List) → Paid → Filter: This Month</code><br/>
      — Expenses: <code>Jobber → Reports → Expense Reports → Expenses → Filter: This Month</code><br/><br/>
      Upload both CSVs below. The <strong>Realizada</strong> tab will populate automatically.<br/>
      Use <strong>Manual Adj.</strong> column to make retroactive corrections (e.g. a payment made in July that belongs to June costs) — these adjustments are saved separately and will NOT be overwritten when you re-upload the CSV.<br/>
      The <strong>Econômica</strong> tab shows Realizada + your adjustments based on Pipedrive data for undelivered jobs. Fill in the blue columns at month end.
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div className="ptitle">DRE — {MONTHS_EN[month]} {year}</div>
      <div style={{display:"flex",gap:8}}>
        {["realizada","economica"].map(m=><button key={m} className={`btn bsm ${mode===m?"bp":"bgg"}`} onClick={()=>setMode(m)}>{m==="realizada"?"Realizada":"Econômica"}</button>)}
      </div>
    </div>
    <div className="psub">{mode==="realizada"?"Import Jobber CSVs to populate. Use Manual Adj. for retroactive corrections.":"Realizada + economic adjustments based on undelivered jobs (Pipedrive). For jobs sold but not delivered, ask the deals to Junior, sum the amount, and the estimated costs for subs and materials."}</div>

    <div className="card" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div className="ctitle" style={{marginBottom:0}}>Import from Jobber</div>
        {msg&&<span style={{fontSize:12,color:msg.includes("⚠️")?C.amber:C.green}}>{msg}</span>}
      </div>
      <div className="info" style={{marginBottom:12}}>Data imported here also feeds the Cash Flow Projection automatically.</div>
      <div className="g2">
        <div><div className="fl" style={{marginBottom:6}}>Expenses CSV</div>
          <label className="upzone" style={{display:"block"}}><div style={{fontSize:13,color:C.text2}}>📁 Jobber Expense Report</div><div style={{fontSize:11,color:C.text2,marginTop:4,opacity:.6}}>Click to upload — overwrites this month's data</div><input type="file" accept=".csv" style={{display:"none"}} onChange={e=>upload(e,"exp")}/></label>
        </div>
        <div><div className="fl" style={{marginBottom:6}}>Payments CSV</div>
          <label className="upzone" style={{display:"block"}}><div style={{fontSize:13,color:C.text2}}>💰 Jobber Payments (Transaction List)</div><div style={{fontSize:11,color:C.text2,marginTop:4,opacity:.6}}>Click to upload — populates revenue</div><input type="file" accept=".csv" style={{display:"none"}} onChange={e=>upload(e,"pay")}/></label>
        </div>
      </div>
    </div>

    <div className="card" style={{padding:0,overflow:"hidden"}}>
      {/* Headers */}
      {mode==="realizada"&&<div style={{display:"grid",gridTemplateColumns:cols3,background:"var(--bg2)",borderRadius:"8px 8px 0 0"}}>
        <div style={{padding:"10px 12px",fontSize:11,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:".5px"}}>Line</div>
        <div style={{padding:"10px 12px",fontSize:11,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>From CSV</div>
        <div style={{padding:"10px 12px",fontSize:11,color:"#F5A623",fontWeight:500,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>Adj.</div>
        <div style={{padding:"10px 12px",fontSize:11,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>Total</div>
      </div>}
      {mode==="economica"&&<div style={{display:"grid",gridTemplateColumns:cols2,background:"var(--bg2)",borderRadius:"8px 8px 0 0"}}>
        <div style={{padding:"10px 12px",fontSize:11,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:".5px"}}>Line</div>
        <div style={{padding:"10px 12px",fontSize:11,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>Realizada</div>
        <div style={{padding:"10px 12px",fontSize:11,color:"#4ABCD4",fontWeight:500,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>+ Eco Adj.</div>
      </div>}

      {DRE_STRUCTURE.map(({key,type})=>{
        const isCalc=type==="calc";
        const rv=realized[key];const ev=economic[key];
        if(isCalc){
          if(mode==="realizada") return <div key={key} className="dre-calc" style={{display:"grid",gridTemplateColumns:cols3,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div className="dre-lbl dre-lbl-c">{DRE_LABELS[key]}</div>
            <div style={{padding:"9px 12px"}}></div>
            <div style={{padding:"9px 12px"}}></div>
            <div className={`dre-val dre-val-c ${fmtNum(rv)>=0?"ap":"an"}`}>{fmt(rv)}</div>
          </div>;
          return <div key={key} className="dre-calc" style={{display:"grid",gridTemplateColumns:cols2,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div className="dre-lbl dre-lbl-c">{DRE_LABELS[key]}</div>
            <div className={`dre-val dre-val-c ${fmtNum(rv)>=0?"ap":"an"}`}>{fmt(rv)}</div>
            <div className={`dre-val dre-val-c ${fmtNum(ev)>=0?"ap":"an"}`}>{fmt(ev)}</div>
          </div>;
        }
        if(mode==="realizada") return <div key={key} style={{display:"grid",gridTemplateColumns:cols3,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
          <div className="dre-lbl">{DRE_LABELS[key]}</div>
          <div className="dre-inp"><input type="number" value={baseData[key]||""} onChange={e=>setV(key,e.target.value)} placeholder="0.00"/></div>
          <div className="dre-inp"><input type="number" value={adjData[key]||""} onChange={e=>setAdj(key,e.target.value)} placeholder="±0" style={{color:"#F5A623",borderColor:"rgba(245,166,35,0.3)"}}/></div>
          <div className="dre-val" style={{color:fmtNum(realizedRaw[key])>=0?"var(--t1)":"var(--re)",fontFamily:"var(--mono)"}}>{fmt(fmtNum(baseData[key])+fmtNum(adjData[key]))}</div>
        </div>;
        return <div key={key} style={{display:"grid",gridTemplateColumns:cols2,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
          <div className="dre-lbl">{DRE_LABELS[key]}</div>
          <div className="dre-val" style={{fontFamily:"var(--mono)",color:"var(--t2)"}}>{fmt(realizedRaw[key])}</div>
          <div className="dre-inp"><input type="number" value={dreEco[key]||""} onChange={e=>setE(key,e.target.value)} placeholder="±0" style={{color:"#4ABCD4",borderColor:"rgba(74,188,212,0.3)"}}/></div>
        </div>;
      })}
    </div>
    <div className="info" style={{marginTop:12}}>
      {mode==="realizada"?"⚠️ Manual Adj. column: use this for retroactive corrections (e.g. expenses paid in the wrong month). These are saved separately and survive CSV re-imports.":"💡 Eco Adj. column: for jobs sold but not delivered, ask Junior for the deals, sum the amount, and estimate the costs for subs and materials. Fill in at month end."}
    </div>
    <ManagementNotes data={data} setData={setData} month={month} year={year}/>
  </div>;
}

// ─── CASH FLOW TAB ────────────────────────────────────────────────────────────
function CashFlowTab({data,setData,month,year}) {
  const mk=`${year}-${month}`;
  const cfSettings=data.cashFlowSettings?.[mk]||{};
  const [openingBalance,setOpeningBalance]=useState(cfSettings.openingBalance||"");
  const dreEstimate=data.dreEstimate?.[mk]||{};
  const [showEstimate,setShowEstimate]=useState(false);

  const saveOpening=v=>{
    setOpeningBalance(v);
    setData(d=>({...d,cashFlowSettings:{...(d.cashFlowSettings||{}),[mk]:{...(d.cashFlowSettings?.[mk]||{}),[k]:v,openingBalance:Number(v)||0}}}));
  };
  // fix: use correct key
  const saveOpeningFixed=v=>{
    setOpeningBalance(v);
    setData(d=>({...d,cashFlowSettings:{...(d.cashFlowSettings||{}),[mk]:{...(d.cashFlowSettings?.[mk]||{}),openingBalance:Number(v)||0}}}));
  };

  const opening=fmtNum(openingBalance)||fmtNum(cfSettings.openingBalance)||0;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const dayKeys=Array.from({length:daysInMonth},(_,i)=>`${year}-${String(month+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  const dailyCSV=(data.cashFlowDaily?.[mk])||[];

  const pendingRec=(data.receivables||[]).filter(r=>r.status!=="paid"&&r.dueDate&&parseLocalDate(r.dueDate).getMonth()===month&&parseLocalDate(r.dueDate).getFullYear()===year);
  const pendingPay=(data.payables||[]).filter(p=>p.status!=="paid"&&p.dueDate&&parseLocalDate(p.dueDate).getMonth()===month&&parseLocalDate(p.dueDate).getFullYear()===year);
  const pendingCon=(data.contractors||[]).filter(c=>c.status!=="paid"&&c.dueDate&&parseLocalDate(c.dueDate).getMonth()===month&&parseLocalDate(c.dueDate).getFullYear()===year);

  const chartData=useMemo(()=>{
    let balance=opening;
    return dayKeys.map(dayKey=>{
      const isPast=dayKey<=todayStr;
      const realized=dailyCSV.filter(t=>t.date===dayKey);
      const realizedIn=realized.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
      const realizedOut=realized.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
      const projIn=isPast?0:pendingRec.filter(r=>r.dueDate===dayKey).reduce((s,r)=>s+fmtNum(r.remaining),0);
      const projOut=isPast?0:(pendingPay.filter(p=>p.dueDate===dayKey).reduce((s,p)=>s+fmtNum(p.amount),0)+pendingCon.filter(c=>c.dueDate===dayKey).reduce((s,c)=>s+fmtNum(c.amount),0));
      balance=balance+realizedIn-realizedOut+projIn-projOut;
      return {day:String(parseInt(dayKey.split("-")[2])),dayKey,isPast,realizedIn,realizedOut,projIn,projOut,balance:Math.round(balance)};
    });
  },[dayKeys,dailyCSV,opening,pendingRec,pendingPay,pendingCon]);

  const totalIn=chartData.reduce((s,d)=>s+d.realizedIn,0);
  const totalOut=chartData.reduce((s,d)=>s+d.realizedOut,0);
  const projIn=chartData.reduce((s,d)=>s+d.projIn,0);
  const projOut=chartData.reduce((s,d)=>s+d.projOut,0);
  const endBalance=chartData[chartData.length-1]?.balance||0;
  const todayBal=chartData.find(d=>d.dayKey===todayStr)?.balance||opening;

  // DRE Estimate computed
  const estimateComputed=computeDRE(dreEstimate);
  const setEst=(k,v)=>setData(d=>({...d,dreEstimate:{...(d.dreEstimate||{}),[mk]:{...(d.dreEstimate?.[mk]||{}),[k]:v}}}));
  const clearEstimate=()=>setData(d=>({...d,dreEstimate:{...(d.dreEstimate||{}),[mk]:{}}}));

  return <div>
    <div className="help-box">
      <strong>💰 Cash Flow Projection — How to use:</strong><br/>
      1. Enter the <strong>opening balance</strong> (your bank balance on the 1st of the month).<br/>
      2. Upload the Jobber CSVs in the <strong>DRE tab</strong> — this tab updates automatically with daily transactions.<br/>
      3. The chart shows <strong>realized</strong> (from CSV) + <strong>projected</strong> (from pending receivables and payables).<br/>
      4. Use <strong>DRE Estimate</strong> to forecast how the month will close — fill in expected revenue and costs. Saved automatically, clear anytime.
    </div>

    <BasisNotice type="cashflow"/>
    {(year<2026||(year===2026&&month<5))
      ?<div style={{textAlign:"center",padding:"48px 24px",color:"var(--t2)",fontSize:13,background:"var(--bg2)",borderRadius:12}}>🔒 Cash Flow tracking starts from <strong style={{color:"var(--t1)"}}>June 2026</strong>. Switch to June or later.</div>
      :<div>
    <div className="ptitle" style={{marginBottom:4}}>Cash Flow Projection</div>
    <div className="psub">{MONTHS_EN[month]} {year}</div>

    <div className="g2" style={{marginBottom:16}}>
      <div className="card">
        <div className="ctitle">Opening Balance</div>
        <div className="fg">
          <input type="number" value={openingBalance} onChange={e=>saveOpeningFixed(e.target.value)} placeholder="e.g. 50000" style={{fontFamily:"var(--mono)"}}/>
          <div style={{fontSize:11,color:"var(--t2)"}}>Bank balance on {MONTHS_EN[month]} 1st</div>
        </div>
      </div>
      <div className="card">
        <div className="ctitle">🏦 Bank Reconciliation</div>
        <div className="fg" style={{gap:10}}>
          <div className="g2">
            <div>
              <div style={{fontSize:11,color:"var(--t2)",marginBottom:4}}>Current Bank Balance ($)</div>
              <input type="number" value={cfSettings.currentBank||""} onChange={e=>setData(d=>({...d,cashFlowSettings:{...(d.cashFlowSettings||{}),[mk]:{...(d.cashFlowSettings?.[mk]||{}),[mk]:undefined,openingBalance:fmtNum(openingBalance),currentBank:Number(e.target.value)||0}}}))} placeholder="Enter current balance" style={{fontFamily:"var(--mono)"}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:"var(--t2)",marginBottom:4}}>Last Check Date</div>
              <input type="date" value={cfSettings.lastBankCheck||""} onChange={e=>setData(d=>({...d,cashFlowSettings:{...(d.cashFlowSettings||{}),[mk]:{...(d.cashFlowSettings?.[mk]||{}),lastBankCheck:e.target.value}}}))}/>
            </div>
          </div>
          {cfSettings.currentBank>0&&(()=>{
            const diff=(cfSettings.currentBank||0)-todayBal;
            return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:Math.abs(diff)<500?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",borderRadius:8,border:`1px solid ${Math.abs(diff)<500?"rgba(52,211,153,0.2)":"rgba(248,113,113,0.2)"}`}}>
              <span style={{fontSize:12,color:"var(--t2)"}}>Difference vs Projected</span>
              <span style={{fontSize:13,fontWeight:600,fontFamily:"var(--mono)",color:Math.abs(diff)<500?C.green:C.re}}>{diff>=0?"+":""}{fmt(diff)}</span>
            </div>;
          })()}
          {cfSettings.lastBankCheck&&<div style={{fontSize:11,color:"var(--t2)"}}>Last checked: {cfSettings.lastBankCheck}</div>}
        </div>
      </div>
    </div>

    <div className="g4" style={{marginBottom:16}}>
      <div className="stat"><div className="sl">Opening</div><div className="sv" style={{color:C.blue}}>{fmt(opening)}</div></div>
      <div className="stat"><div className="sl">Balance Today</div><div className="sv" style={{color:todayBal>=0?C.green:C.re}}>{fmt(todayBal)}</div><div className="ss">realized</div></div>
      <div className="stat"><div className="sl">Month-End Projection</div><div className="sv" style={{color:endBalance>=0?C.green:C.re}}>{fmt(endBalance)}</div></div>
      <div className="stat"><div className="sl">Still to Receive</div><div className="sv" style={{color:C.amber}}>{fmt(projIn)}</div><div className="ss">pending receivables</div></div>
    </div>

    <div className="ccart">
      <div className="ctitle">Daily Balance Curve</div>
      <div style={{fontSize:11,color:C.text2,marginBottom:12}}>Realized (from Jobber CSV) + Projected (from pending payables & receivables)</div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{top:5,right:20,bottom:5,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
          <XAxis dataKey="day" tick={{fill:C.text2,fontSize:10}} axisLine={false} tickLine={false} interval={2}/>
          <YAxis tickFormatter={fmtK} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={55}/>
          <Tooltip content={<CT/>}/>
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
          <Area type="monotone" dataKey="balance" stroke={C.teal} strokeWidth={2} fill="rgba(27,122,138,0.1)" dot={false} name="Balance"/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    <div className="ccart">
      <div className="ctitle">Daily Inflows vs Outflows</div>
      <div style={{fontSize:11,color:C.text2,marginBottom:12}}>Green = realized inflows · Blue = projected inflows · Red = realized outflows · Orange = projected outflows</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{top:5,right:20,bottom:5,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
          <XAxis dataKey="day" tick={{fill:C.text2,fontSize:10}} axisLine={false} tickLine={false} interval={2}/>
          <YAxis tickFormatter={fmtK} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={50}/>
          <Tooltip content={<CT/>}/>
          <Bar dataKey="realizedIn" fill={C.green} name="Inflows (real)" stackId="in"/>
          <Bar dataKey="projIn" fill={C.blue} name="Inflows (proj)" stackId="in" opacity={0.6}/>
          <Bar dataKey="realizedOut" fill={C.red} name="Outflows (real)" stackId="out"/>
          <Bar dataKey="projOut" fill={C.orange} name="Outflows (proj)" stackId="out" opacity={0.6}/>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="g2" style={{marginBottom:16}}>
      <div className="card">
        <div className="ctitle">Realized — Up to Today</div>
        {[{l:"Total Inflows",v:totalIn},{l:"Total Outflows",v:-totalOut},{l:"Net Balance",v:totalIn-totalOut}].map(({l,v})=>
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--bdr)"}}>
            <span style={{fontSize:13,color:C.text2}}>{l}</span>
            <span className={v>=0?"ap":"an"} style={{fontSize:13}}>{fmt(Math.abs(v))}</span>
          </div>
        )}
      </div>
      <div className="card">
        <div className="ctitle">Projected — Rest of Month</div>
        {[{l:"Expected to Receive",v:projIn},{l:"Expected to Pay",v:-projOut},{l:"Net Projected",v:projIn-projOut}].map(({l,v})=>
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--bdr)"}}>
            <span style={{fontSize:13,color:C.text2}}>{l}</span>
            <span className={v>=0?"ap":"an"} style={{fontSize:13}}>{fmt(Math.abs(v))}</span>
          </div>
        )}
      </div>
    </div>

    {/* DRE Estimate */}
    <div className="card">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div className="ctitle" style={{marginBottom:2}}>📈 DRE Estimate — Month Forecast</div>
          <div style={{fontSize:12,color:C.text2}}>Estimate how the month will close. Saved automatically. Clear anytime.</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn bsm bgg" onClick={()=>setShowEstimate(!showEstimate)}>{showEstimate?"Collapse":"Expand"}</button>
          <button className="btn bsm bdel" onClick={clearEstimate}>Clear</button>
        </div>
      </div>
      {showEstimate&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 140px 140px",borderBottom:"1px solid var(--bdr)",marginBottom:4}}>
          <div style={{padding:"8px 12px",fontSize:11,color:C.text2,textTransform:"uppercase",letterSpacing:".5px"}}>Line</div>
          <div style={{padding:"8px 12px",fontSize:11,color:C.text2,textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>Realized</div>
          <div style={{padding:"8px 12px",fontSize:11,color:"#F5A623",textTransform:"uppercase",letterSpacing:".5px",textAlign:"right"}}>Estimate</div>
        </div>
        {DRE_STRUCTURE.map(({key,type})=>{
          const realized2=computeDRE(data.dreData?.[mk]||HIST_R[mk]||{});
          const rv=realized2[key];const ev=estimateComputed[key];
          const isCalc=type==="calc";
          if(isCalc) return <div key={key} style={{display:"grid",gridTemplateColumns:"1fr 140px 140px",background:"rgba(232,57,42,0.05)",borderTop:"1px solid rgba(232,57,42,0.15)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div className="dre-lbl dre-lbl-c">{DRE_LABELS[key]}</div>
            <div className={`dre-val dre-val-c ${fmtNum(rv)>=0?"ap":"an"}`}>{fmt(rv)}</div>
            <div className={`dre-val dre-val-c ${fmtNum(ev)>=0?"ap":"an"}`}>{ev!==undefined?fmt(ev):"—"}</div>
          </div>;
          return <div key={key} style={{display:"grid",gridTemplateColumns:"1fr 140px 140px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div className="dre-lbl">{DRE_LABELS[key]}</div>
            <div className="dre-val" style={{color:"var(--t2)",fontFamily:"var(--mono)"}}>{fmt(rv)}</div>
            <div className="dre-inp"><input type="number" value={dreEstimate[key]||""} onChange={e=>setEst(key,e.target.value)} placeholder="0.00" style={{color:"#F5A623",borderColor:"rgba(245,166,35,0.3)"}}/></div>
          </div>;
        })}
      </div>}
    </div>
    </div>}
  </div>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function OperationalDashboard({data,month,year}) {
  const [dreType,setDreType]=useState("realizada");
  const mk=`${year}-${month}`;
  const baseData=data.dreData?.[mk]||HIST_R[mk]||{};
  const adjData=data.dreAdj?.[mk]||{};
  const realizedRaw={...baseData};
  DRE_INPUT_KEYS.forEach(k=>{realizedRaw[k]=fmtNum(baseData[k])+fmtNum(adjData[k]);});
  // Apply economic adjustments if in eco mode
  const dreEcoExtra=data.dreEcoExtra?.[mk]||{};
  const displayData={...realizedRaw};
  if(dreType==="economica") {
    DRE_INPUT_KEYS.forEach(k=>{displayData[k]=fmtNum(realizedRaw[k])+fmtNum(dreEcoExtra[k]);});
  }
  const computed=computeDRE(displayData);
  const receivables=(data.receivables||[]).filter(r=>{const d=parseLocalDate(r.createdAt||r.dueDate)||new Date();return d.getMonth()===month&&d.getFullYear()===year;});
  const contractors=(data.contractors||[]).filter(r=>{const d=parseLocalDate(r.createdAt||r.dueDate)||new Date();return d.getMonth()===month&&d.getFullYear()===year;});
  const pendingRec=receivables.filter(r=>r.status!=="paid").reduce((s,r)=>s+fmtNum(r.remaining),0);
  const pendingCon=contractors.filter(c=>c.status!=="paid").reduce((s,c)=>s+fmtNum(c.amount),0);
  const overdueRec=receivables.filter(r=>r.status!=="paid"&&agingDays(r.dueDate)>0);
  const overduePay=(data.payables||[]).filter(p=>{const d=parseLocalDate(p.createdAt||p.dueDate)||new Date();return d.getMonth()===month&&d.getFullYear()===year&&p.status!=="paid"&&agingDays(p.dueDate)>0;});
  const margin=computed.receita_liquida>0?Math.round(computed.margem/computed.receita_liquida*100):0;
  return <div>
    <RolloverBanner month={month} year={year}/>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div className="ptitle" style={{marginBottom:0}}>Dashboard</div>
      <div style={{display:"flex",gap:4,background:"var(--bg3)",padding:3,borderRadius:8}}>
        {["realizada","economica"].map(t=><button key={t} style={{background:dreType===t?"#1B7A8A":"transparent",color:dreType===t?"white":C.text2,border:"none",padding:"5px 12px",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:500}} onClick={()=>setDreType(t)}>{t==="realizada"?"Realizada":"Econômica"}</button>)}
      </div>
    </div>
    <div className="psub">{MONTHS_EN[month]} {year} — {dreType==="realizada"?"Realizada":"Econômica"}</div>
    <div className="g4">
      <div className="stat"><div className="sl">Net Revenue</div><div className="sv" style={{color:C.blue}}>{fmt(computed.receita_liquida)}</div></div>
      <div className="stat"><div className="sl">Contribution Margin</div><div className="sv" style={{color:C.green}}>{fmt(computed.margem)}</div><div className="ss">{margin}%</div></div>
      <div className="stat"><div className="sl">Net Income (pre-tax)</div><div className="sv" style={{color:computed.lucro_ir>=0?C.green:C.re}}>{fmt(computed.lucro_ir)}</div></div>
      <div className="stat"><div className="sl">Outstanding</div><div className="sv" style={{color:C.amber}}>{fmt(pendingRec)}</div></div>
    </div>
    <div className="g2">
      <div className="card">
        <div className="ctitle">⚠️ Alerts</div>
        {(()=>{
          const alerts=[];
          if(overdueRec.length>0) alerts.push({type:"red",msg:`${overdueRec.length} overdue receivable(s)`,detail:overdueRec.slice(0,3).map(r=>`${r.client} — ${fmt(r.remaining)}`).join(" · ")});
          if(overduePay.length>0) alerts.push({type:"amber",msg:`${overduePay.length} overdue payable(s)`,detail:overduePay.slice(0,3).map(p=>`${p.description} — ${fmt(p.amount)}`).join(" · ")});
          if(pendingCon>0) alerts.push({type:"red",msg:`Subcontractors to pay: ${fmt(pendingCon)}`});
          const mp=computed.receita_liquida>0?computed.margem/computed.receita_liquida*100:0;
          const sp=computed.receita_liquida>0?fmtNum(realizedRaw.cogs_subs)/computed.receita_liquida*100:0;
          if(computed.receita_liquida>0&&mp<45) alerts.push({type:"red",msg:`⚡ Margin below 45% (${mp.toFixed(1)}%)`,detail:"Review job pricing and subcontractor costs."});
          if(computed.receita_liquida>0&&sp>25) alerts.push({type:"amber",msg:`⚡ Subcontractors above 25% of revenue (${sp.toFixed(1)}%)`,detail:"Check if jobs are correctly priced."});
          if(computed.lucro_ir<0&&computed.receita_liquida>0) alerts.push({type:"red",msg:`⚡ Net income negative this month (${fmt(computed.lucro_ir)})`,detail:"Review cost structure."});
          if(computed.receita_liquida>0&&computed.margem>0&&computed.lucro_ir<0) alerts.push({type:"amber",msg:"⚡ Positive margin but negative net income",detail:"Fixed expenses are too high relative to margin."});
          if(alerts.length===0) return <div style={{color:C.green,fontSize:13}}>✓ All clear — no alerts this month!</div>;
          return <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {alerts.map((a,i)=><div key={i} style={{background:a.type==="red"?"rgba(232,57,42,0.1)":"rgba(245,166,35,0.1)",border:`1px solid ${a.type==="red"?"rgba(232,57,42,0.2)":"rgba(245,166,35,0.2)"}`,borderRadius:8,padding:"10px 14px"}}>
              <div style={{fontSize:13,color:a.type==="red"?C.red:C.amber,fontWeight:500}}>{a.msg}</div>
              {a.detail&&<div style={{fontSize:11,color:C.text2,marginTop:3}}>{a.detail}</div>}
            </div>)}
          </div>;
        })()}
      </div>
      <div className="card">
        <div className="ctitle">DRE Summary</div>
        {[
          {label:"Net Revenue",value:computed.receita_liquida},
          {label:"Total COGS",value:-(fmtNum(displayData.cogs_materials)+fmtNum(displayData.cogs_subs)+fmtNum(displayData.cogs_fuel)+fmtNum(displayData.cogs_genn))},
          {label:"Contribution Margin",value:computed.margem},
          {label:"Fixed Expenses",value:-(fmtNum(displayData.mkt)+fmtNum(displayData.sal_adm)+fmtNum(displayData.sal_ops)+fmtNum(displayData.custos_fixos)+fmtNum(displayData.estoque)+fmtNum(displayData.softwares)+fmtNum(displayData.contabilidade))},
          {label:"Operating Income",value:computed.lucro_op},
          {label:"Net Income (pre-tax)",value:computed.lucro_ir},
        ].map(({label,value})=><div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--bdr)"}}>
          <span style={{fontSize:13,color:C.text2}}>{label}</span>
          <span className={fmtNum(value)>=0?"ap":"an"} style={{fontSize:13}}>{fmt(value)}</span>
        </div>)}
      </div>
    </div>
  </div>;
}


// ─── MANAGEMENT NOTES ────────────────────────────────────────────────────────
function ManagementNotes({data,setData,month,year}) {
  const mk=`${year}-${month}`;
  const note=data.monthNotes?.[mk]||"";
  const [val,setVal]=useState(note);
  const [saved,setSaved]=useState(false);
  useEffect(()=>setVal(data.monthNotes?.[mk]||""),[mk,data.monthNotes]);
  const save=()=>{
    setData(d=>({...d,monthNotes:{...(d.monthNotes||{}),[mk]:val}}));
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  return <div className="card" style={{marginBottom:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div className="ctitle" style={{marginBottom:0}}>📝 Management Notes — {MONTHS_EN[month]} {year}</div>
      {saved&&<span style={{fontSize:11,color:C.green}}>✓ Saved</span>}
    </div>
    <textarea rows={3} value={val} onChange={e=>setVal(e.target.value)} onBlur={save} placeholder="Add context for this month: key events, unusual expenses, large jobs, retroactive payments, market notes..." style={{resize:"vertical",lineHeight:1.6}}/>
    <div style={{fontSize:11,color:"var(--t2)",marginTop:6}}>Auto-saved when you click outside. Visible in Analytics for context.</div>
  </div>;
}


// ─── MONTH-END CLOSE TAB ─────────────────────────────────────────────────────
const CHECKLIST_ITEMS = [
  {id:"payments_csv", label:"Import Payments CSV from Jobber", hint:"Jobber → Reports → Financial Reports (Transaction List) → Paid → Filter: This Month"},
  {id:"expenses_csv", label:"Import Expenses CSV from Jobber", hint:"Jobber → Reports → Expense Reports → Expenses → Filter: This Month"},
  {id:"receivables_review", label:"Review open receivables — confirm paid/pending", hint:"Check Receivables tab. Mark any received payments."},
  {id:"subs_review", label:"Review subcontractor payments — confirm all paid", hint:"Check Subcontractors tab. Confirm all payments were made."},
  {id:"payables_review", label:"Review payables — confirm all bills paid", hint:"Check Payables tab. Mark any paid bills."},
  {id:"dre_adj", label:"Fill in DRE Realizada manual adjustments (if any)", hint:"DRE tab → Realizada → Adj. column. For retroactive corrections only."},
  {id:"dre_eco", label:"Fill in DRE Econômica adjustments via Pipedrive", hint:"DRE tab → Econômica. Add jobs sold but not yet delivered."},
  {id:"unmapped_check", label:"Check for unmapped Jobber categories", hint:"After importing CSVs, check for ⚠️ warning in DRE tab."},
  {id:"cashflow_balance", label:"Update opening balance and verify bank reconciliation", hint:"Cash Flow tab → Opening Balance + Bank Reconciliation section."},
  {id:"notes", label:"Add management notes for the month", hint:"DRE tab → Management Notes. Document key events, unusual costs, context."},
];

function MonthCloseTab({data,setData,month,year}) {
  const mk=`${year}-${month}`;
  const checks=data.monthClose?.[mk]||{};
  const toggle=(id)=>setData(d=>({...d,monthClose:{...(d.monthClose||{}),[mk]:{...(d.monthClose?.[mk]||{}),[id]:!checks[id]}}}));
  const completedCount=CHECKLIST_ITEMS.filter(i=>checks[i.id]).length;
  const total=CHECKLIST_ITEMS.length;
  const pct=Math.round(completedCount/total*100);

  const isLocked=data.monthStatus?.[mk]==="locked";

  const setStatus=(s)=>setData(d=>({...d,monthStatus:{...(d.monthStatus||{}),[mk]:s}}));
  const status=data.monthStatus?.[mk]||"open";
  const statusColor={open:C.text2,reviewing:C.amber,closed:C.blue,locked:C.green};
  const statusLabel={open:"Open",reviewing:"Reviewing",closed:"Closed",locked:"🔒 Locked"};

  return <div>
    <div className="ptitle" style={{marginBottom:4}}>Month-End Close</div>
    <div className="psub">{MONTHS_EN[month]} {year} — {completedCount}/{total} steps completed</div>

    {/* Progress bar */}
    <div style={{background:"var(--bg2)",borderRadius:8,height:8,marginBottom:16,overflow:"hidden"}}>
      <div style={{background:pct===100?C.green:C.teal,height:"100%",width:pct+"%",transition:"width .3s",borderRadius:8}}/>
    </div>

    {/* Status */}
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div className="ctitle" style={{marginBottom:4}}>Month Status</div>
          <span style={{fontSize:13,color:statusColor[status],fontWeight:600}}>{statusLabel[status]}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {isLocked
            ? <button className="btn bsm bdel" onClick={()=>setStatus("closed")}>🔓 Unlock</button>
            : ["open","reviewing","closed","locked"].map(s=><button key={s} className={`btn bsm ${status===s?"bp":"bgg"}`} onClick={()=>setStatus(s)}>{statusLabel[s]}</button>)
          }
        </div>
      </div>
      {isLocked&&<div className="info" style={{marginTop:12,marginBottom:0}}>🔒 This month is locked. Click Unlock to reopen.</div>}
    </div>

    {/* Checklist */}
    <div className="card" style={{padding:0,overflow:"hidden"}}>
      {CHECKLIST_ITEMS.map((item,idx)=>(
        <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderBottom:idx<CHECKLIST_ITEMS.length-1?"1px solid rgba(255,255,255,0.04)":"none",opacity:checks[item.id]?0.5:1,cursor:"pointer"}} onClick={()=>toggle(item.id)}>
          <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checks[item.id]?C.green:"rgba(255,255,255,0.2)"}`,background:checks[item.id]?"rgba(52,211,153,.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flex:"none",marginTop:1}}>
            {checks[item.id]&&<span style={{fontSize:12,color:C.green}}>✓</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:checks[item.id]?"var(--t2)":"var(--t1)",textDecoration:checks[item.id]?"line-through":"none"}}>{item.label}</div>
            <div style={{fontSize:11,color:"var(--t2)",marginTop:3}}>{item.hint}</div>
          </div>
        </div>
      ))}
    </div>
    <ManagementNotes data={data} setData={setData} month={month} year={year}/>
  </div>;
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function AnalyticsDashboard({data,month,year}) {
  const [dreType,setDreType]=useState("realizada");
  const [fromMonth,setFromMonth]=useState(0);
  const [fromYear,setFromYear]=useState(year);
  const [toMonth,setToMonth]=useState(month);
  const [toYear,setToYear]=useState(year);
  const months=useMemo(()=>{
    const result=[];let y=fromYear,m=fromMonth;
    while(y<toYear||(y===toYear&&m<=toMonth)){result.push({year:y,month:m,label:MONTHS_EN[m].substring(0,3)+" '"+String(y).slice(2)});m++;if(m>11){m=0;y++;}if(result.length>24) break;}
    return result;
  },[fromMonth,fromYear,toMonth,toYear]);
  const seriesData=useMemo(()=>months.map(({year:y,month:m,label})=>{
    const d=getDREForMonth(data,y,m,dreType==="economica"?"eco":"real");
    if(!d) return {label,receita:0,margem:0,lucro:0,cogs:0,mkt:0,subs:0,custos:0,margem_pct:0,subs_pct:0};
    const c=computeDRE(d);
    const mp=c.receita_liquida>0?Math.round(c.margem/c.receita_liquida*100):0;
    const sp=c.receita_liquida>0?Math.round(fmtNum(d.cogs_subs)/c.receita_liquida*100):0;
    const cogs=fmtNum(d.cogs_materials)+fmtNum(d.cogs_subs)+fmtNum(d.cogs_fuel)+fmtNum(d.cogs_genn);
    const custos=fmtNum(d.mkt)+fmtNum(d.sal_adm)+fmtNum(d.sal_ops)+fmtNum(d.custos_fixos)+fmtNum(d.estoque)+fmtNum(d.softwares)+fmtNum(d.contabilidade);
    return {label,receita:Math.round(c.receita_liquida),margem:Math.round(c.margem),lucro:Math.round(c.lucro_ir),cogs:Math.round(cogs),mkt:Math.round(fmtNum(d.mkt)),subs:Math.round(fmtNum(d.cogs_subs)),custos:Math.round(custos),margem_pct:mp,subs_pct:sp};
  }),[months,data,dreType]);
  const discrepancias=useMemo(()=>{
    if(seriesData.length<2) return [];
    const curr=seriesData[seriesData.length-1],prev=seriesData[seriesData.length-2];
    const keys=["receita","margem","lucro","cogs","mkt","subs","custos"];
    const labels={receita:"Revenue",margem:"Contribution Margin",lucro:"Net Income",cogs:"Total COGS",mkt:"Marketing",subs:"Subcontractors",custos:"Fixed Expenses"};
    return keys.map(k=>{const diff=prev[k]!==0?Math.round((curr[k]-prev[k])/Math.abs(prev[k])*100):0;return{key:k,label:labels[k],curr:curr[k],prev:prev[k],diff};}).filter(d=>Math.abs(d.diff)>=10).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
  },[seriesData]);
  const cumData=useMemo(()=>{let cR=0,cM=0,cL=0;return months.map(({year:y,month:m,label})=>{const d=getDREForMonth(data,y,m,dreType==="economica"?"eco":"real");if(!d) return {label,cumReceita:cR,cumMargem:cM,cumLucro:cL};const c=computeDRE(d);cR+=c.receita_liquida;cM+=c.margem;cL+=c.lucro_ir;return {label,cumReceita:Math.round(cR),cumMargem:Math.round(cM),cumLucro:Math.round(cL)};});},[months,data,dreType]);
  const totalReceita=seriesData.reduce((s,d)=>s+d.receita,0);
  const totalMargem=seriesData.reduce((s,d)=>s+d.margem,0);
  const totalLucro=seriesData.reduce((s,d)=>s+d.lucro,0);
  const avgMp=seriesData.filter(d=>d.receita>0).length>0?Math.round(seriesData.filter(d=>d.receita>0).reduce((s,d)=>s+d.margem_pct,0)/seriesData.filter(d=>d.receita>0).length):0;
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><div className="ptitle">Analytics</div></div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{fontSize:12,color:C.text2}}>Historical financial analysis</div>
      <div style={{display:"flex",gap:4,background:"var(--bg3)",padding:3,borderRadius:8}}>
        {["realizada","economica"].map(t=><button key={t} style={{background:dreType===t?"#1B7A8A":"transparent",color:dreType===t?"white":C.text2,border:"none",padding:"5px 12px",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans'",fontWeight:500}} onClick={()=>setDreType(t)}>{t==="realizada"?"Realizada":"Econômica"}</button>)}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16,background:"var(--bg2)",padding:"14px 16px",borderRadius:10,border:"1px solid var(--bdr)"}}>
      <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.text2,fontWeight:600,minWidth:36}}>From:</span>
          <select className="msel" value={fromMonth} onChange={e=>setFromMonth(Number(e.target.value))}>{MONTHS_EN.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
          <select className="msel" value={fromYear} onChange={e=>setFromYear(Number(e.target.value))}>{[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.text2,fontWeight:600,minWidth:24}}>To:</span>
          <select className="msel" value={toMonth} onChange={e=>setToMonth(Number(e.target.value))}>{MONTHS_EN.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
          <select className="msel" value={toYear} onChange={e=>setToYear(Number(e.target.value))}>{[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>
      <span style={{fontSize:11.5,color:C.text2}}>{months.length} {months.length===1?"month":"months"} selected</span>
    </div>
    <div className="g4" style={{marginBottom:16}}>
      <div className="stat"><div className="sl">Total Revenue</div><div className="sv" style={{color:C.blue}}>{fmtK(totalReceita)}</div><div className="ss">{months.length} months</div></div>
      <div className="stat"><div className="sl">Total Margin</div><div className="sv" style={{color:C.green}}>{fmtK(totalMargem)}</div><div className="ss">avg {avgMp}%</div></div>
      <div className="stat"><div className="sl">Total Net Income</div><div className="sv" style={{color:totalLucro>=0?C.green:C.re}}>{fmtK(totalLucro)}</div></div>
      <div className="stat"><div className="sl">Profitable Months</div><div className="sv" style={{color:C.teal}}>{seriesData.filter(d=>d.lucro>0).length}/{seriesData.length}</div></div>
    </div>
    <div className="ccart"><div className="ctitle">Revenue × Contribution Margin × Net Income</div>
      <ResponsiveContainer width="100%" height={220}><LineChart data={seriesData} margin={{top:5,right:20,bottom:5,left:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
        <XAxis dataKey="label" tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false}/>
        <YAxis tickFormatter={fmtK} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={50}/>
        <Tooltip content={<CT/>}/><ReferenceLine y={0} stroke="rgba(255,255,255,0.1)"/>
        <Line type="monotone" dataKey="receita" stroke={C.blue} strokeWidth={2} dot={{fill:C.blue,r:3}} name="Revenue"/>
        <Line type="monotone" dataKey="margem" stroke={C.green} strokeWidth={2} dot={{fill:C.green,r:3}} name="Margin"/>
        <Line type="monotone" dataKey="lucro" stroke={C.yellow} strokeWidth={2} dot={{fill:C.yellow,r:3}} name="Net Income"/>
      </LineChart></ResponsiveContainer>
    </div>
    <div className="ccart"><div className="ctitle">Contribution Margin %</div><div style={{fontSize:11,color:C.text2,marginBottom:12}}>Target: above 50%</div>
      <ResponsiveContainer width="100%" height={180}><BarChart data={seriesData} margin={{top:5,right:20,bottom:5,left:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
        <XAxis dataKey="label" tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false}/>
        <YAxis tickFormatter={v=>v+"%"} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={40}/>
        <Tooltip content={<CT/>} formatter={v=>v+"%"}/>
        <ReferenceLine y={50} stroke={C.amber} strokeDasharray="4 4" label={{value:"50%",fill:C.amber,fontSize:11}}/>
        <Bar dataKey="margem_pct" fill={C.teal} radius={[4,4,0,0]} name="Margin %"/>
      </BarChart></ResponsiveContainer>
    </div>
    <div className="g2">
      <div className="ccart"><div className="ctitle">Cost Breakdown</div>
        <ResponsiveContainer width="100%" height={200}><BarChart data={seriesData} margin={{top:5,right:10,bottom:5,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
          <XAxis dataKey="label" tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={fmtK} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={45}/>
          <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:11,color:C.text2}}/>
          <Bar dataKey="cogs" fill={C.red} stackId="a" name="COGS"/>
          <Bar dataKey="mkt" fill={C.orange} stackId="a" name="Marketing"/>
          <Bar dataKey="custos" fill={C.teal} stackId="a" name="Fixed Exp." radius={[4,4,0,0]}/>
        </BarChart></ResponsiveContainer>
      </div>
      <div className="ccart"><div className="ctitle">Subcontractors % of Revenue</div><div style={{fontSize:11,color:C.text2,marginBottom:12}}>Target: below 25%</div>
        <ResponsiveContainer width="100%" height={200}><BarChart data={seriesData} margin={{top:5,right:10,bottom:5,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
          <XAxis dataKey="label" tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={v=>v+"%"} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={40}/>
          <Tooltip content={<CT/>} formatter={v=>v+"%"}/>
          <ReferenceLine y={25} stroke={C.amber} strokeDasharray="4 4" label={{value:"25%",fill:C.amber,fontSize:11}}/>
          <Bar dataKey="subs_pct" fill={C.orange} radius={[4,4,0,0]} name="Subs %"/>
        </BarChart></ResponsiveContainer>
      </div>
    </div>
    <div className="ccart"><div className="ctitle">Cumulative DRE</div>
      <ResponsiveContainer width="100%" height={220}><LineChart data={cumData} margin={{top:5,right:20,bottom:5,left:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
        <XAxis dataKey="label" tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false}/>
        <YAxis tickFormatter={fmtK} tick={{fill:C.text2,fontSize:11}} axisLine={false} tickLine={false} width={55}/>
        <Tooltip content={<CT/>}/><ReferenceLine y={0} stroke="rgba(255,255,255,0.1)"/>
        <Line type="monotone" dataKey="cumReceita" stroke={C.blue} strokeWidth={2} strokeDasharray="5 3" dot={{fill:C.blue,r:3}} name="Revenue (cum.)"/>
        <Line type="monotone" dataKey="cumMargem" stroke={C.green} strokeWidth={2} dot={{fill:C.green,r:3}} name="Margin (cum.)"/>
        <Line type="monotone" dataKey="cumLucro" stroke={C.yellow} strokeWidth={2} dot={{fill:C.yellow,r:3}} name="Net Income (cum.)"/>
      </LineChart></ResponsiveContainer>
    </div>
    {/* Management notes inline in analytics */}
    {months.map(({year:y,month:m,label})=>{
      const note=data.monthNotes?.[`${y}-${m}`];
      if(!note) return null;
      return <div key={`${y}-${m}`} style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--bdr)",borderRadius:8,padding:"10px 14px",marginBottom:8,fontSize:12}}>
        <span style={{color:"var(--t2)",marginRight:8}}>{label}:</span><span style={{color:"var(--t1)"}}>{note}</span>
      </div>;
    })}
    {discrepancias.length>0&&<div className="ccart"><div className="ctitle">⚠️ Discrepancies — {seriesData[seriesData.length-2]?.label} vs {seriesData[seriesData.length-1]?.label}</div>
      <div style={{fontSize:11,color:C.text2,marginBottom:12}}>Variations above 10%</div>
      {discrepancias.map(d=><div key={d.key} className="disc-row">
        <div style={{fontSize:13,color:C.text2}}>{d.label}</div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:12,color:C.text2,fontFamily:"var(--mono)"}}>{fmtK(d.prev)} → {fmtK(d.curr)}</span>
          <span style={{fontSize:13,fontFamily:"var(--mono)",fontWeight:600,color:d.diff>0?C.re:C.green,minWidth:60,textAlign:"right"}}>{d.diff>0?"+":""}{d.diff}%</span>
        </div>
      </div>)}
    </div>}
  </div>;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const EMPTY={receivables:[],contractors:[],payables:[],dreData:{},dreEcoExtra:{},dreAdj:{},dreEstimate:{},cashFlowDaily:{},cashFlowSettings:{},monthNotes:{},monthClose:{},monthStatus:{}};

export default function App() {
  const [data,setDataRaw]=useState(EMPTY);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [section,setSection]=useState("operacional");
  const [tab,setTab]=useState("dashboard");
  const [month,setMonth]=useState(today.getMonth());
  const [year]=useState(today.getFullYear());

  useEffect(()=>{
    let loaded=0;const check=()=>{loaded++;if(loaded>=4) setLoading(false);};
    const unsubs=[];
    unsubs.push(onSnapshot(collection(db,"receivables"),snap=>{
      const fbRecs=snap.docs.map(d=>({id:d.id,...d.data()}));
      const fbIds=new Set(fbRecs.map(r=>r.id));
      const deletedHist=new Set();
      snap.docs.forEach(d=>{if(d.data()._deleted) deletedHist.add(d.id);});
      // Auto-seed: if none of the hist items exist in Firebase yet, write them all
      const histMissing=HIST_RECEIVABLES.filter(r=>!fbIds.has(r.id));
      if(histMissing.length===HIST_RECEIVABLES.length) {
        // First load — seed all historical receivables to Firebase
        histMissing.forEach(r=>fbSet("receivables",r.id,r));
      }
      const histItems=HIST_RECEIVABLES.filter(r=>!fbIds.has(r.id)&&!deletedHist.has(r.id));
      setDataRaw(p=>({...p,receivables:[...histItems,...fbRecs.filter(r=>!r._deleted)]}));
      check();
    },(e)=>{console.error(e);check();}));
    unsubs.push(onSnapshot(collection(db,"contractors"),snap=>{setDataRaw(p=>({...p,contractors:snap.docs.map(d=>({id:d.id,...d.data()}))}));check();},(e)=>{console.error(e);check();}));
    unsubs.push(onSnapshot(collection(db,"payables"),snap=>{setDataRaw(p=>({...p,payables:snap.docs.map(d=>({id:d.id,...d.data()}))}));check();},(e)=>{console.error(e);check();}));
    unsubs.push(onSnapshot(collection(db,"dre"),snap=>{
      const dreData={},dreEcoExtra={},dreAdj={},dreEstimate={},cashFlowDaily={},cashFlowSettings={};
      snap.docs.forEach(d=>{
        const id=d.id,dd=d.data();
        if(id.startsWith("real_")) dreData[id.replace("real_","")]=dd.data||{};
        else if(id.startsWith("eco_")) dreEcoExtra[id.replace("eco_","")]=dd.data||{};
        else if(id.startsWith("adj_")) dreAdj[id.replace("adj_","")]=dd.data||{};
        else if(id.startsWith("est_")) dreEstimate[id.replace("est_","")]=dd.data||{};
        else if(id.startsWith("cf_daily_")) cashFlowDaily[id.replace("cf_daily_","")]=dd.data||[];
        else if(id.startsWith("cf_settings_")) cashFlowSettings[id.replace("cf_settings_","")]=dd.data||{};
      });
      const monthNotes={},monthClose={},monthStatus={};
      snap.docs.forEach(d=>{
        if(d.id.startsWith("notes_")) monthNotes[d.id.replace("notes_","")]=d.data().note||"";
        else if(d.id.startsWith("close_")) monthClose[d.id.replace("close_","")]=d.data().data||{};
        else if(d.id.startsWith("status_")) monthStatus[d.id.replace("status_","")]=d.data().status||"open";
      });
      setDataRaw(p=>({...p,dreData,dreEcoExtra,dreAdj,dreEstimate,cashFlowDaily,cashFlowSettings,monthNotes,monthClose,monthStatus}));
      check();
    },(e)=>{console.error(e);check();}));
    return ()=>unsubs.forEach(u=>u());
  },[]);

  const setData=useCallback(u=>{
    setDataRaw(prev=>{
      const next=typeof u==="function"?u(prev):u;
      setSaving(true);
      const saveArr=(col,items,prevItems)=>(items||[]).forEach(item=>{const pi=(prevItems||[]).find(p=>p.id===item.id);if(!pi||JSON.stringify(pi)!==JSON.stringify(item)) fbSet(col,item.id,item);});
      if(JSON.stringify(next.receivables)!==JSON.stringify(prev.receivables)) saveArr("receivables",next.receivables,prev.receivables);
      if(JSON.stringify(next.contractors)!==JSON.stringify(prev.contractors)) saveArr("contractors",next.contractors,prev.contractors);
      if(JSON.stringify(next.payables)!==JSON.stringify(prev.payables)) saveArr("payables",next.payables,prev.payables);
      const saveDRE=(prefix,obj,prevObj)=>Object.keys(obj||{}).forEach(mk=>{if(JSON.stringify(obj[mk])!==JSON.stringify((prevObj||{})[mk])) fbSetDoc(`dre/${prefix}_${mk}`,{data:obj[mk]});});
      if(JSON.stringify(next.dreData)!==JSON.stringify(prev.dreData)) saveDRE("real",next.dreData,prev.dreData);
      if(JSON.stringify(next.monthNotes)!==JSON.stringify(prev.monthNotes)) Object.keys(next.monthNotes||{}).forEach(mk=>{if(next.monthNotes[mk]!==(prev.monthNotes||{})[mk]) fbSetDoc(`dre/notes_${mk}`,{note:next.monthNotes[mk]});});
      if(JSON.stringify(next.monthClose)!==JSON.stringify(prev.monthClose)) saveDRE("close",next.monthClose,prev.monthClose);
      if(JSON.stringify(next.monthStatus)!==JSON.stringify(prev.monthStatus)) Object.keys(next.monthStatus||{}).forEach(mk=>{if(next.monthStatus[mk]!==(prev.monthStatus||{})[mk]) fbSetDoc(`dre/status_${mk}`,{status:next.monthStatus[mk]});});
      if(JSON.stringify(next.dreEcoExtra)!==JSON.stringify(prev.dreEcoExtra)) saveDRE("eco",next.dreEcoExtra,prev.dreEcoExtra);
      if(JSON.stringify(next.dreAdj)!==JSON.stringify(prev.dreAdj)) saveDRE("adj",next.dreAdj,prev.dreAdj);
      if(JSON.stringify(next.dreEstimate)!==JSON.stringify(prev.dreEstimate)) saveDRE("est",next.dreEstimate,prev.dreEstimate);
      if(JSON.stringify(next.cashFlowDaily)!==JSON.stringify(prev.cashFlowDaily)) saveDRE("cf_daily",next.cashFlowDaily,prev.cashFlowDaily);
      if(JSON.stringify(next.cashFlowSettings)!==JSON.stringify(prev.cashFlowSettings)) saveDRE("cf_settings",next.cashFlowSettings,prev.cashFlowSettings);
      setTimeout(()=>setSaving(false),1500);
      return next;
    });
  },[]);

  if(loading) return <><style>{css}</style><div className="loading"><div style={{width:32,height:32,border:"3px solid rgba(232,57,42,0.3)",borderTop:"3px solid #E8392A",borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span>Loading data...</span><style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style></div></>;

  const opTabs=[{id:"dashboard",label:"Dashboard"},{id:"receivables",label:"Receivables"},{id:"contractors",label:"Subcontractors"},{id:"payables",label:"Payables"},{id:"dre",label:"DRE"},{id:"cashflow",label:"Cash Flow"},{id:"monthclose",label:"Month Close"}];
  const anTabs=[{id:"analytics",label:"Analytics"}];
  const tabs=section==="operacional"?opTabs:anTabs;

  return <>
    <style>{css}</style>
    <div className="app">
      <div className="topbar">
        <div className="logo">JN Service <span>Financial Tool</span></div>
        <div className="stabs">
          <button className={`stab ${section==="operacional"?"active":""}`} onClick={()=>{setSection("operacional");setTab("dashboard");}}>Operational</button>
          <button className={`stab ${section==="analytics"?"active":""}`} onClick={()=>{setSection("analytics");setTab("analytics");}}>Analytics</button>
        </div>
        <select className="msel" value={month} onChange={e=>setMonth(Number(e.target.value))}>
          {MONTHS_EN.map((m,i)=><option key={i} value={i}>{m} {year}</option>)}
        </select>
        <div className="sync"><div className={`sync-dot ${saving?"saving":""}`}/><span>{saving?"Saving...":"Synced"}</span></div>
      </div>
      <div className="subnav">
        {tabs.map(t=><button key={t.id} className={`nb ${tab===t.id?(section==="operacional"?"ac":"at"):""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>
      <div className="content">
        {tab==="dashboard"&&<OperationalDashboard data={data} month={month} year={year}/>}
        {tab==="receivables"&&<ReceivablesTab data={data} setData={setData} month={month} year={year}/>}
        {tab==="contractors"&&<ContractorsTab data={data} setData={setData} month={month} year={year}/>}
        {tab==="payables"&&<PayablesTab data={data} setData={setData} month={month} year={year}/>}
        {tab==="dre"&&<DRETab data={data} setData={setData} month={month} year={year}/>}
        {tab==="cashflow"&&<CashFlowTab data={data} setData={setData} month={month} year={year}/>}
        {tab==="monthclose"&&<MonthCloseTab data={data} setData={setData} month={month} year={year}/>}
        {tab==="analytics"&&<AnalyticsDashboard data={data} month={month} year={year}/>}
      </div>
    </div>
  </>;
}
