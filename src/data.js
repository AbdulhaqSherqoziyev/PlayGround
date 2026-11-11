// Compact educational dataset. Values are rounded reference values at ~20–25 °C and 1 atm.
// Sources are linked in the UI; mixture and instrument outputs are estimates, not measurements.
export const substances = [
  {id:'water',name:'Deionized water',formula:'H₂O',plainFormula:'H2O',type:'liquid',category:'liquid',molarMass:18.015,density:0.998,mp:0, bp:100,solubility:'Miscible with many polar liquids',color:'#87d7ca',appearance:'Clear, colorless liquid',hazard:'Low hazard; avoid contamination',ph:7,volumePerGram:1.002,description:'Reference solvent for this prototype. Water ionization and detailed solution equilibria are not modeled.',source:'NIST Chemistry WebBook, SRD 69 · PubChem CID 962'},
  {id:'vinegar',name:'Vinegar (5% acetic acid)',formula:'CH₃COOH · aq',plainFormula:'CH3COOH',type:'solution',category:'liquid',molarMass:60.052,density:1.01,mp:-2,bp:100,solubility:'Miscible with water',color:'#d8c88d',appearance:'Clear, colorless aqueous solution',hazard:'Dilute food-grade model; eye irritation possible',ph:2.8,volumePerGram:.99,acidMassFraction:.05,description:'Represented as a 5% by mass acetic-acid aqueous solution. Real vinegar composition varies by product.',source:'PubChem Acetic Acid · NIST Chemistry WebBook; composition is stated model assumption'},
  {id:'bicarbonate',name:'Sodium bicarbonate',formula:'NaHCO₃',plainFormula:'NaHCO3',type:'solid',category:'solid',molarMass:84.007,density:2.20,mp:270,bp:null,solubility:'9.6 g / 100 mL water at 20 °C',color:'#e4e0d1',appearance:'White crystalline powder',hazard:'Low hazard; dust may irritate eyes',ph:8.3,volumePerGram:.455,description:'Solid sodium hydrogen carbonate. Thermal decomposition is outside this prototype.',source:'PubChem CID 516892 · CRC Handbook (solubility)'},
  {id:'salt',name:'Sodium chloride',formula:'NaCl',plainFormula:'NaCl',type:'solid',category:'solid',molarMass:58.443,density:2.165,mp:801,bp:1465,solubility:'35.9 g / 100 mL water at 20 °C',color:'#e2e0d5',appearance:'White cubic crystals',hazard:'Low hazard in small quantities',ph:7,volumePerGram:.462,description:'Ionic solid. The simplified model marks dissolution in water; it does not calculate ion activities.',source:'PubChem CID 5234 · CRC Handbook of Chemistry and Physics'},
  {id:'glucose',name:'D-glucose',formula:'C₆H₁₂O₆',plainFormula:'C6H12O6',type:'solid',category:'solid',molarMass:180.156,density:1.54,mp:146, bp:null,solubility:'Highly soluble in water',color:'#e4ddc8',appearance:'White crystalline powder',hazard:'Low hazard; avoid inhaling dust',ph:7,volumePerGram:.649,description:'D-glucose anhydrous reference. Dissolution shown; metabolism and chemical reactions are not modeled.',source:'PubChem CID 5793 · NIST Chemistry WebBook'},
  {id:'citric',name:'Citric acid',formula:'C₆H₈O₇',plainFormula:'C6H8O7',type:'solid',category:'solid',molarMass:192.124,density:1.665,mp:153,bp:null,solubility:'Very soluble in water',color:'#e8e2cb',appearance:'White crystalline granules',hazard:'Eye irritant in concentrated form',ph:2.2,volumePerGram:.601,description:'Anhydrous citric acid. Polyprotic equilibria are not modeled; not currently in the curated reaction set.',source:'PubChem CID 311 · NIST Chemistry WebBook'},
  {id:'calcium-carbonate',name:'Calcium carbonate',formula:'CaCO₃',plainFormula:'CaCO3',type:'solid',category:'solid',molarMass:100.087,density:2.71,mp:825,bp:null,solubility:'Sparingly soluble in water',color:'#dedbd0',appearance:'White mineral powder',hazard:'Low hazard; dust may irritate',ph:9,volumePerGram:.369,description:'Calcite reference values. Decomposition and acid reactions are unsupported in this prototype.',source:'PubChem CID 10112 · CRC Handbook'},
  {id:'copper',name:'Copper',formula:'Cu',plainFormula:'Cu',type:'solid',category:'solid',molarMass:63.546,density:8.96,mp:1084.6,bp:2562,solubility:'Insoluble in water',color:'#c77e58',appearance:'Reddish metallic solid',hazard:'Bulk metal model; dust hazards are not represented',ph:null,volumePerGram:.112,description:'Elemental copper. Displayed as an inert sample; no oxidation chemistry is modeled.',source:'NIST Chemistry WebBook · PubChem CID 23978'},
  {id:'iron',name:'Iron',formula:'Fe',plainFormula:'Fe',type:'solid',category:'solid',molarMass:55.845,density:7.874,mp:1538,bp:2862,solubility:'Insoluble in water',color:'#a7aaa2',appearance:'Gray metallic filings',hazard:'Avoid dust; sharp particles',ph:null,volumePerGram:.127,description:'Elemental iron sample. Corrosion chemistry and reaction kinetics are not modeled.',source:'NIST Chemistry WebBook · PubChem CID 23925'},
  {id:'ethanol',name:'Ethanol (dilute)',formula:'C₂H₅OH',plainFormula:'C2H6O',type:'liquid',category:'liquid',molarMass:46.069,density:.94,mp:-114.1,bp:78.4,solubility:'Miscible with water',color:'#bbd9cb',appearance:'Clear liquid (dilute model)',hazard:'Flammable; virtual use only',ph:null,volumePerGram:1.064,description:'A dilute educational representation only; combustion and other hazardous chemistry are excluded.',source:'PubChem CID 702 · NIST Chemistry WebBook'},
  {id:'sugar',name:'Sucrose',formula:'C₁₂H₂₂O₁₁',plainFormula:'C12H22O11',type:'solid',category:'solid',molarMass:342.297,density:1.587,mp:186,bp:null,solubility:'Soluble in water',color:'#e5dfce',appearance:'White crystalline granules',hazard:'Low hazard; avoid inhaling dust',ph:null,volumePerGram:.63,description:'Sucrose reference. Dissolution is modeled qualitatively; no decomposition chemistry is supported.',source:'PubChem CID 5988 · NIST Chemistry WebBook'}
];

// Curated, balanced reactions only. The supported gas-forming example is a benign
// educational representation. No general reaction prediction is attempted.
export const reactions = [{
  id:'acid-bicarbonate', title:'Acid–bicarbonate neutralization', type:'chemical',
  reactants:[{id:'acetic-acid',formula:'C2H4O2',coefficient:1},{id:'bicarbonate',formula:'NaHCO3',coefficient:1}],
  products:[{id:'sodium-acetate',formula:'C2H3NaO2',coefficient:1},{id:'carbon-dioxide',formula:'CO2',coefficient:1},{id:'water',formula:'H2O',coefficient:1}],
  equation:'CH₃COOH + NaHCO₃ → CH₃COONa + CO₂ + H₂O',
  atoms:{C:3,H:5,Na:1,O:5},
  observations:['Carbon dioxide effervescence is expected','The aqueous mixture contains sodium acetate','Heat release is not quantified in this model'],
  reference:'OpenStax Chemistry 2e, 4.2 Classifying Chemical Reactions; balanced equation verified by atom count'
}];

export const products = {
  'sodium-acetate':{id:'sodium-acetate',name:'Sodium acetate (aq)',formula:'CH₃COONa',plainFormula:'C2H3NaO2',molarMass:82.034,color:'#91d4bb'},
  'carbon-dioxide':{id:'carbon-dioxide',name:'Carbon dioxide (gas)',formula:'CO₂',plainFormula:'CO2',molarMass:44.009,color:'#a6e5d4'},
  'water-product':{id:'water-product',name:'Water',formula:'H₂O',plainFormula:'H2O',molarMass:18.015,color:'#87d7ca'}
};

export const sources = [
  'NIST Chemistry WebBook, Standard Reference Database 69 — https://webbook.nist.gov/chemistry/',
  'PubChem Compound summaries — https://pubchem.ncbi.nlm.nih.gov/',
  'CRC Handbook of Chemistry and Physics — reference values for common physical properties and solubilities.',
  'OpenStax Chemistry 2e — https://openstax.org/details/books/chemistry-2e (reaction classification and stoichiometry).',
  'Values are rounded and conditions vary by source. Data gaps are intentionally left blank. This prototype is not a molecular simulator.'
];