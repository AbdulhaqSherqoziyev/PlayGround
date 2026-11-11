import {substances, reactions, products} from './data.js';

const byId = Object.fromEntries(substances.map(s => [s.id,s]));
const reactionMass = { 'acetic-acid':60.052, bicarbonate:84.0066, 'sodium-acetate':82.0338, 'carbon-dioxide':44.0095, water:18.0153 };

export function parseFormula(formula){
  const atoms={};
  for(const [,element,count] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) atoms[element]=(atoms[element]||0)+(Number(count)||1);
  return atoms;
}
export function isBalanced(reaction){
  const totals={};
  for(const side of ['reactants','products']) for(const item of reaction[side]){
    const formula = item.formula || byId[item.id]?.plainFormula || products[item.id]?.plainFormula;
    if(!formula) return false;
    for(const [atom,count] of Object.entries(parseFormula(formula))) totals[atom]=(totals[atom]||0)+(side==='reactants'?1:-1)*count*item.coefficient;
  }
  return Object.values(totals).every(v=>v===0);
}
export function mixtureMass(contents){return Object.values(contents).reduce((sum,g)=>sum+g,0)}
export function estimateVolume(contents){return Object.entries(contents).reduce((sum,[id,g])=>sum+g*(byId[id]?.volumePerGram ?? .8),0)}
export function estimateDensity(contents){const mass=mixtureMass(contents),volume=estimateVolume(contents);return volume?mass/volume:null}

/** Deterministic, deliberately small chemistry model. Unknown pairs remain unknown. */
export function analyze(contents,temperature=22,stirring=false){
  const ids=Object.keys(contents).filter(id=>contents[id]>1e-8), massBefore=mixtureMass(contents);
  if(!ids.length) return {kind:'empty',title:'Ready for experimentation',message:'Add one or more substances to the vessel, then analyze the mixture. The engine only reports curated outcomes.',status:'AWAITING',contents:{},mass:0,volume:0,density:null,ph:null};
  if(ids.length===1){const id=ids[0],s=byId[id];return {kind:'single',title:`${s.name} sample`,message:`A single-substance sample. No chemical transformation is predicted. ${phaseFor(s,temperature)}.`,status:'SAMPLE',contents:{...contents},mass:massBefore,volume:estimateVolume(contents),density:estimateDensity(contents),ph:s.ph,observations:[phaseFor(s,temperature)]};}

  const hasWater=ids.includes('water');
  const isNeutralization=ids.includes('vinegar')&&ids.includes('bicarbonate')&&ids.length===2;
  if(isNeutralization){
    const acidMoles=(contents.vinegar*.05)/reactionMass['acetic-acid'];
    const baseMoles=contents.bicarbonate/reactionMass.bicarbonate;
    const extent=Math.min(acidMoles,baseMoles);
    if(extent<=1e-10)return unsupported(massBefore,contents);
    const consumedVinegarSolution=extent*reactionMass['acetic-acid']/.05;
    const leftoverVinegar=contents.vinegar-consumedVinegarSolution;
    const leftoverBase=contents.bicarbonate-extent*reactionMass.bicarbonate;
    const output={};
    // Only the reacted aliquot of 5% vinegar is represented in products;
    // unreacted solution (including its carrier water) remains as vinegar.
    if(leftoverVinegar>1e-7)output.vinegar=leftoverVinegar;
    if(leftoverBase>1e-7)output.bicarbonate=leftoverBase;
    output['sodium-acetate']=extent*reactionMass['sodium-acetate'];
    output['carbon-dioxide']=extent*reactionMass['carbon-dioxide'];
    output['water-product']=extent*reactionMass.water + consumedVinegarSolution*.95;
    const massAfter=Object.values(output).reduce((sum,g)=>sum+g,0);
    const delta=massBefore-massAfter;
    if(Math.abs(delta)>0.002) return {kind:'error',title:'Mass balance check failed',message:'This result did not pass the prototype mass-balance tolerance and has been withheld.',status:'CHECK FAILED',contents:{...contents},mass:massBefore,volume:estimateVolume(contents),density:estimateDensity(contents),ph:null};
    if(!isBalanced(reactions[0])) return {kind:'error',title:'Reaction data check failed',message:'The curated equation failed its atom-balance check; no products are reported.',status:'CHECK FAILED',contents:{...contents},mass:massBefore,volume:estimateVolume(contents),density:estimateDensity(contents),ph:null};
    const limiting=acidMoles<baseMoles?'Acetic acid (in vinegar)':'Sodium bicarbonate';
    return {kind:'reaction',title:'Acid–bicarbonate reaction supported',message:`${reactions[0].equation}. ${limiting} is limiting. Approx. ${extent.toFixed(4)} mol reaction extent; product amounts are theoretical estimates.`,status:'SUPPORTED',contents:output,mass:massAfter,volume:estimateVolume(output),density:null,ph:7,gas:true,observations:reactions[0].observations,limiting,energy:'Not calculated',reaction:reactions[0],massError:delta};
  }

  if(hasWater&&ids.every(id=>['water','salt','glucose','sugar','citric','bicarbonate','calcium-carbonate'].includes(id))){
    const solids=ids.filter(id=>id!=='water');
    const dissolved=solids.filter(id=>{
      const limit={salt:359,glucose:900,citric:590,bicarbonate:96,'calcium-carbonate':.013,sugar:2000};
      return contents[id]/contents.water*100<=limit[id];
    });
    const undissolved=solids.filter(id=>!dissolved.includes(id));
    if(!solids.length)return {kind:'physical',title:'Water sample',message:'Only water is present; no transformation is predicted.',status:'PHYSICAL',contents:{...contents},mass:massBefore,volume:estimateVolume(contents),density:estimateDensity(contents),ph:7,observations:['No chemical reaction supported']};
    return {kind:'dissolution',title:undissolved.length?'Physical mixture · partial dissolution':'Physical mixing · dissolution',message:undissolved.length?`Water and ${dissolved.length?dissolved.map(id=>byId[id].name).join(', ')+' dissolve(s), while '+undissolved.map(id=>byId[id].name).join(', ')+' exceed the simplified solubility bound.':'solid(s) remain beyond the simplified solubility bound.'} No chemical reaction is predicted.`:`${solids.map(id=>byId[id].name).join(' and ')} dissolve(s) in water under the prototype's simplified solubility check. No new substances are formed.`,status:'PHYSICAL',contents:{...contents},mass:massBefore,volume:estimateVolume(contents),density:estimateDensity(contents),ph:7,observations:[undissolved.length?'Some solid remains undissolved':'Dissolution; no chemical transformation']};
  }
  if(ids.every(id=>['vinegar','water'].includes(id))||ids.every(id=>['water','ethanol'].includes(id))){return {kind:'physical',title:'Physical mixing',message:'These liquids mix physically in this model. No chemical products are predicted.',status:'PHYSICAL',contents:{...contents},mass:massBefore,volume:estimateVolume(contents),density:estimateDensity(contents),ph:ids.includes('vinegar')?3:7,observations:['Physical mixing; no new chemical species']};}
  return unsupported(massBefore,contents);
}
function unsupported(mass,contents){return {kind:'unsupported',title:'No supported outcome',message:'This combination is outside the curated reaction and solubility set. The simulator will not invent products or claim that no reaction is possible.',status:'UNSUPPORTED',contents:{...contents},mass,volume:estimateVolume(contents),density:estimateDensity(contents),ph:null,observations:['Outcome unknown in this model']};}
function phaseFor(s,temp){if(temp<s.mp)return `Below the listed melting point (${s.mp} °C); solid-state behavior is simplified`;if(s.bp!==null&&temp>=s.bp)return `At or above the listed boiling point (${s.bp} °C); phase change is indicated`;if(temp>=s.mp&&s.type==='solid')return `Solid at ambient pressure (listed melting point ${s.mp} °C)`;if(s.id==='water'&&temp>=0)return 'Liquid water at this modeled temperature';return `State model based on reference melting/boiling points (${temp} °C)`;}
export function findSubstance(id){return byId[id]||products[id]||null;}
