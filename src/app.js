import {substances, sources} from './data.js';
import {analyze, findSubstance, estimateDensity, estimateVolume, mixtureMass} from './chemistry.js';

const $ = s => document.querySelector(s);
const state={contents:{},selected:null,category:'all',search:'',temperature:22,stirring:false,result:null,journal:[],zoom:100,rotation:0};
const list=$('#inventory-list');

function renderInventory(){
  $('.count-pill').textContent=String(substances.length).padStart(2,'0');
  const visible=substances.filter(s=>(state.category==='all'||s.category===state.category)&&(`${s.name} ${s.formula} ${s.type}`).toLowerCase().includes(state.search.toLowerCase()));
  list.innerHTML=visible.map(s=>`<article class="chemical-card ${state.selected===s.id?'selected':''}" data-id="${s.id}" draggable="true" title="${s.name} · ${s.formula}">
    <div class="chem-icon" style="--chem-color:${s.color}"><span class="mini-vial"></span></div><div class="chem-meta"><div class="chem-name">${s.name}</div><div class="chem-formula">${s.formula}</div><div class="chem-type">${s.type.toUpperCase()} · ${s.molarMass.toFixed(2)} g/mol</div></div><button class="add-chem" title="Add ${s.name}">＋</button></article>`).join('')||'<div class="empty-contents"><p>No matching material</p></div>';
  list.querySelectorAll('.chemical-card').forEach(card=>{
    const id=card.dataset.id;
    card.addEventListener('click',e=>{state.selected=id;renderInventory();if(e.target.closest('.add-chem'))addMaterial(id);else showChemical(id);});
    card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='copy';state.selected=id;});
  });
}
function showChemical(id){const s=findSubstance(id);if(!s)return;openModal('SUBSTANCE REFERENCE',s.name,`<div class="property-modal"><p class="formula-large">${s.formula}</p><p>${s.description}</p><h3>Reference properties</h3><ul><li>Molar mass: ${s.molarMass.toFixed(3)} g/mol</li><li>State: ${s.type}; appearance: ${s.appearance}</li><li>Density: ${s.density} g/cm³</li><li>Melting point: ${s.mp} °C · boiling point: ${s.bp===null?'not applicable / decomposes':`${s.bp} °C`}</li><li>Solubility: ${s.solubility}</li><li>Hazard note: ${s.hazard}</li><li>Source: ${s.source}</li></ul><p class="fine-print">Rounded reference values; source conditions may differ. Hazard information is not a substitute for a safety data sheet.</p></div>`);}
function getAmount(){const input=$('#amount-input');let value=Number(input.value);if(!Number.isFinite(value)||value<=0)value=1;return Math.min(value,100);}
function addMaterial(id,amount=getAmount()){
  const s=findSubstance(id);if(!s)return;
  state.contents[id]=(state.contents[id]||0)+amount;state.selected=id;state.result=null;sync();toast('Material added',`${s.name} · ${amount.toFixed(1)} g added to vessel`);
}
function sync(){
  const {contents}=state,mass=mixtureMass(contents),volume=estimateVolume(contents),density=estimateDensity(contents),ids=Object.keys(contents).filter(id=>contents[id]>1e-8),temp=state.temperature;
  const vessel=$('#drop-zone'),liquid=$('#liquid'),hasLiquid=ids.some(id=>['water','vinegar','ethanol','water-product'].includes(id));
  vessel.classList.toggle('filled',ids.length>0);$('#scale-reading').textContent=mass.toFixed(2);$('#vessel-volume').textContent=`${Math.max(0,Math.round(volume))} mL · BOROSILICATE`;
  const visualVolume=Math.min(68,Math.max(0,volume*.55));liquid.style.height=ids.length?`${Math.max(8,visualVolume)}%`:'0%';
  if(ids.some(id=>id==='vinegar'))liquid.style.background='linear-gradient(90deg,#adad7c80,#ddd39e9b 48%,#b5b28a88)';
  else if(ids.some(id=>['copper','iron','calcium-carbonate'].includes(id)))liquid.style.background='linear-gradient(90deg,#897d6470,#c9bd9a88,#77765a77)';
  else liquid.style.background='linear-gradient(90deg,#4fae9377,#89dec1a3 48%,#58b49688)';
  const currentResult=state.result;
  vessel.classList.toggle('has-precipitate',currentResult?.kind==='dissolution'&&currentResult.message.includes('remain'));
  vessel.classList.toggle('has-gas',currentResult?.gas===true);
  vessel.classList.toggle('reaction-active',currentResult?.gas===true);
  document.body.classList.toggle('stirring',state.stirring);
  $('#drop-hint').style.opacity=ids.length?'0':'';
  $('#contents-count').textContent=`${ids.length} MATERIAL${ids.length===1?'':'S'}`;
  $('#read-temp').textContent=temp;$('#temp-display').innerHTML=`${temp} <small>°C</small>`;$('#hotplate-temp').textContent=`${temp}°`;
  const totalMass=currentResult?.mass??mass;$('#read-mass').textContent=totalMass.toFixed(2);
  $('#read-volume').textContent=String(Math.round(currentResult?.volume??volume));
  $('#read-density').textContent=(currentResult?.density??density)?.toFixed(2)??'—';
  $('#density-unit').textContent=(currentResult?.density??density)?'g/cm³':'';
  $('#ph-value').textContent=currentResult?.ph==null?'—':Number(currentResult.ph).toFixed(1);
  $('#ph-marker').style.left=currentResult?.ph==null?'50%':`${Math.max(2,Math.min(98,currentResult.ph/14*100))}%`;
  const materialName=ids.length===0?'Empty vessel':ids.length===1?(findSubstance(ids[0])?.name||'Reaction products'):currentResult?.kind==='reaction'?'Reaction mixture':`${ids.length} material mixture`;
  $('#sample-name').textContent=materialName;$('#sample-subtitle').textContent=ids.length?`${ids.length} material${ids.length===1?'':'s'} · ${totalMass.toFixed(2)} g total`:'Add materials to begin';
  $('#sample-state').textContent=currentResult?.status|| (ids.length?'MIXTURE':'IDLE');
  const orb=$('#sample-orb');orb.style.opacity=ids.length?1:.55;
  const contentsList=$('#contents-list');
  if(!ids.length)contentsList.innerHTML='<div class="empty-contents"><span>◌</span><p>Your vessel is empty</p><small>Select or drag materials from inventory</small></div>';
  else contentsList.innerHTML=ids.map(id=>{const s=findSubstance(id)||{name:id,formula:'',color:'#9bd9b8'};return `<div class="content-row"><i class="content-dot" style="color:${s.color};background:${s.color}"></i><b>${s.name}</b><small>${contents[id].toFixed(2)} g</small><button data-remove="${id}" title="Remove material">×</button></div>`}).join('');
  contentsList.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{delete state.contents[btn.dataset.remove];state.result=null;sync();}));
  renderObservation(currentResult,ids);
  $('#stir-state').textContent=state.stirring?'ON':'OFF';$('#stir-btn').classList.toggle('on',state.stirring);
  const slider=$('#temp-slider');slider.style.background=`linear-gradient(90deg,#d99577 ${(temp-5)/90*100}%,#3b514d ${(temp-5)/90*100}%)`;
}
function renderObservation(result,ids){
  const box=$('#observation'),status=$('#result-status');
  if(!result){status.textContent=ids.length?'NOT ANALYZED':'AWAITING';status.style.color='';box.innerHTML=ids.length?`<div class="observation-symbol">⌖</div><div><b>Mixture ready to analyze</b><p>Results are deterministic and limited to the curated reaction / physical-change set. Unsupported combinations remain unknown.</p></div>`:'<div class="observation-symbol">⌖</div><div><b>Ready for experimentation</b><p>Add one or more substances to the vessel, then analyze the mixture. The engine only reports curated outcomes.</p></div>';return;}
  status.textContent=result.status;
  const icon=result.kind==='reaction'?'✦':result.kind==='unsupported'?'?':'⌖';
  box.innerHTML=`<div class="observation-symbol">${icon}</div><div><b>${result.title}</b><p>${result.message}</p>${result.observations?.length?`<p class="observation-extra">${result.observations.join(' · ')}</p>`:''}${result.limiting?`<p class="observation-extra">Limiting reactant: ${result.limiting} · Energy: ${result.energy}</p>`:''}</div>`;
}
function analyzeSample(){
  const result=analyze(state.contents,state.temperature,state.stirring);state.result=result;
  if(['reaction','dissolution'].includes(result.kind))state.contents={...result.contents};
  sync();const text=result.kind==='reaction'?'Balanced curated reaction evaluated':result.kind==='unsupported'?'Unsupported combination — no products invented':result.kind==='dissolution'?'Physical dissolution evaluated':result.title;toast(result.kind==='reaction'?'Reaction supported':result.kind==='unsupported'?'Outcome unknown':'Analysis complete',text);
}
function toast(title,message){$('#toast-title').textContent=title;$('#toast-description').textContent=message;const t=$('#reaction-toast');t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3500);}
function openModal(eyebrow,title,html){$('#modal-eyebrow').textContent=eyebrow;$('#modal-title').textContent=title;$('#modal-content').innerHTML=html;$('#modal-backdrop').classList.add('open');}
function closeModal(){$('#modal-backdrop').classList.remove('open');}
function record(){if(!state.result){toast('Nothing to record','Analyze the mixture before writing an observation.');return;}const when=new Date().toLocaleString();state.journal.unshift({when,title:state.result.title,message:state.result.message,contents:Object.entries(state.contents).map(([id,g])=>`${findSubstance(id)?.name||id}: ${g.toFixed(2)} g`),temperature:state.temperature});$('#journal-count').textContent=state.journal.length;toast('Observation recorded','Saved to this browser session journal.');}
function showJournal(){const entries=state.journal.length?state.journal.map(e=>`<article class="journal-entry"><small>${e.when} · ${e.temperature} °C</small><b>${e.title}</b><p>${e.message}</p><p>${e.contents.join(' · ')}</p></article>`).join(''):'<p>Your journal is empty. Run an analysis and choose <b>Record observation</b> to save a session note.</p>';openModal('SESSION RECORDS','Experiment journal',entries);}
function showGuide(){openModal('QUICK START','A careful, honest lab model',`<p>This prototype separates the visual bench from a deterministic, curated chemistry engine. It does not predict arbitrary reactions.</p><ol><li>Choose a material in Inventory. Click its plus button, or drag it to the flask.</li><li>Set the sample amount in grams before adding. Adjust modeled temperature with the slider.</li><li>Choose a supported combination and select <b>Analyze mixture</b>.</li><li>Review mass, estimated volume and the observation; record it in your journal.</li></ol><h3>Supported examples</h3><ul><li>Dilute vinegar + sodium bicarbonate: balanced acid–bicarbonate reaction, theoretical stoichiometry, approximate mass balance, and gas observation.</li><li>Water + selected common solids: simplified dissolution / solubility bounds; no new compounds are claimed.</li><li>Other combinations: honestly marked unsupported.</li></ul><p class="fine-print">Amounts are modeled as grams; solution composition, kinetics, pH equilibria, heat transfer and gas escape are simplified or omitted. Protective eyewear is recommended even in the virtual lab.</p>`);}
function showSources(){openModal('DATA & LIMITATIONS','Sources and method',`<p>Properties are rounded reference values; sample calculations use deterministic idealized arithmetic. The interface labels density and volume as approximate and shows uncertainty for basic readings.</p><ul>${sources.map(s=>`<li>${s}</li>`).join('')}</ul><h3>Reaction validation</h3><p>The only curated chemical reaction is balanced by elemental composition at runtime. Unsupported combinations produce no predicted products. Reaction extent uses limiting-reactant stoichiometry; product yields are theoretical. Kinetics, thermal energy, gas loss, ionic strength and equilibrium speciation are not calculated.</p>`);}

list.addEventListener('dragover',e=>{});
const drop=$('#drop-zone');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag-over');});drop.addEventListener('dragleave',()=>drop.classList.remove('drag-over'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');if(findSubstance(id))addMaterial(id);});
$$('.category').forEach(btn=>btn.addEventListener('click',()=>{$$('.category').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.category=btn.dataset.category;renderInventory();}));
function $$(sel){return [...document.querySelectorAll(sel)];}
$('#search').addEventListener('input',e=>{state.search=e.target.value;renderInventory();});
$('#search-toggle').addEventListener('click',()=>{$('#search-box').classList.toggle('search-open');$('#search').focus();});
$('#temp-slider').addEventListener('input',e=>{state.temperature=Number(e.target.value);if(state.result)state.result=null;sync();});
$('#stir-btn').addEventListener('click',()=>{state.stirring=!state.stirring;sync();});
$('#run-btn').addEventListener('click',analyzeSample);
$('#reset-btn').addEventListener('click',()=>{state.contents={};state.result=null;state.selected=null;state.temperature=22;state.stirring=false;$('#temp-slider').value=22;sync();renderInventory();toast('Bench reset','Vessel emptied; session journal retained.');});
$('#record-btn').addEventListener('click',record);$('#journal-open').addEventListener('click',showJournal);$('#guide-btn').addEventListener('click',showGuide);$('#source-btn').addEventListener('click',showSources);
$('#info-btn').addEventListener('click',showSources);$('#toast-close').addEventListener('click',()=>$('#reaction-toast').classList.remove('show'));
$('#modal-close').addEventListener('click',closeModal);$('#modal-backdrop').addEventListener('click',e=>{if(e.target.id==='modal-backdrop')closeModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
$('.theme-toggle').addEventListener('click',()=>document.body.classList.toggle('light-theme'));
$('#zoom-in').addEventListener('click',()=>zoom(10));$('#zoom-out').addEventListener('click',()=>zoom(-10));function zoom(n){state.zoom=Math.max(80,Math.min(120,state.zoom+n));$('#zoom-value').textContent=`${state.zoom}%`;$('.scene-equipment').style.transform=`scale(${state.zoom/100}) rotate(${state.rotation}deg)`;}
$('#rotate-view').addEventListener('click',()=>{state.rotation=(state.rotation+8)%32;$('.scene-equipment').style.transform=`scale(${state.zoom/100}) rotate(${state.rotation}deg)`;});
$('#fullscreen-btn').addEventListener('click',()=>{$('#scene-wrap').requestFullscreen?.();});
setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});},1000);
renderInventory();sync();
