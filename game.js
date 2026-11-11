import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const N=8, FILES='abcdefgh', VALUES={p:100,n:320,b:335,r:500,q:900,k:20000};
const cloneBoard=b=>b.map(row=>row.map(p=>p&&({...p})));
const initialBoard=()=>{
  const b=Array.from({length:8},()=>Array(8).fill(null));
  const back=['r','n','b','q','k','b','n','r'];
  for(let f=0;f<8;f++){b[0][f]={type:back[f],color:'b'};b[1][f]={type:'p',color:'b'};b[6][f]={type:'p',color:'w'};b[7][f]={type:back[f],color:'w'};}
  return b;
};
const state={board:initialBoard(),turn:'w',rights:{wk:true,wq:true,bk:true,bq:true},ep:null,history:[],moves:[],selected:null,legal:[],gameOver:false,thinking:false,local:false,flipped:false,pendingPromotion:null,sound:true};
const opposite=c=>c==='w'?'b':'w';
const inside=(r,f)=>r>=0&&r<8&&f>=0&&f<8;
const algebraic=([r,f])=>FILES[f]+(8-r);

function findKing(board,color){for(let r=0;r<8;r++)for(let f=0;f<8;f++)if(board[r][f]?.type==='k'&&board[r][f].color===color)return[r,f];return null;}
function attacked(board,r,f,by){
  const pawnDir=by==='w'?-1:1, pawnRow=r-pawnDir;
  for(const df of [-1,1])if(inside(pawnRow,f+df)&&board[pawnRow][f+df]?.type==='p'&&board[pawnRow][f+df].color===by)return true;
  for(const [dr,df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const rr=r+dr,ff=f+df;if(inside(rr,ff)&&board[rr][ff]?.type==='n'&&board[rr][ff].color===by)return true;}
  for(const [dr,df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){let rr=r+dr,ff=f+df,step=1;while(inside(rr,ff)){const p=board[rr][ff];if(p){if(p.color===by&&(p.type==='q'||(step===1&&p.type==='k')||(dr===0||df===0?p.type==='r':p.type==='b')))return true;break;}rr+=dr;ff+=df;step++;}}
  return false;
}
function inCheck(board,color){const k=findKing(board,color);return !!k&&attacked(board,k[0],k[1],opposite(color));}
function pseudoMoves(s,color=s.turn){
  const out=[],b=s.board;const add=(r,f,rr,ff,extra={})=>{if(inside(rr,ff)){const target=b[rr][ff];if(!target||target.color!==color)out.push({from:[r,f],to:[rr,ff],...extra});}};
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){
    const p=b[r][f];if(!p||p.color!==color)continue;
    if(p.type==='p'){
      const d=color==='w'?-1:1,start=color==='w'?6:1,last=color==='w'?0:7,nr=r+d;
      if(inside(nr,f)&&!b[nr][f]){add(r,f,nr,f,nr===last?{promotion:true}:{});if(r===start&&!b[r+2*d][f])add(r,f,r+2*d,f,{double:true});}
      for(const df of [-1,1]){const rr=r+d,ff=f+df;if(!inside(rr,ff))continue;if(b[rr][ff]&&b[rr][ff].color!==color)add(r,f,rr,ff,rr===last?{promotion:true}:{});else if(s.ep&&s.ep[0]===rr&&s.ep[1]===ff)out.push({from:[r,f],to:[rr,ff],enPassant:true});}
    }else if(p.type==='n'){
      for(const[dr,df]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r,f,r+dr,f+df);
    }else if(p.type==='k'){
      for(let dr=-1;dr<=1;dr++)for(let df=-1;df<=1;df++)if(dr||df)add(r,f,r+dr,f+df);
      const home=color==='w'?7:0,enemy=opposite(color);
      if(r===home&&f===4&&!attacked(b,home,4,enemy)){
        const kingRight=color==='w'?'wk':'bk',queenRight=color==='w'?'wq':'bq';
        if(s.rights[kingRight]&&!b[home][5]&&!b[home][6]&&b[home][7]?.type==='r'&&b[home][7].color===color&&!attacked(b,home,5,enemy)&&!attacked(b,home,6,enemy))out.push({from:[r,f],to:[home,6],castle:'k'});
        if(s.rights[queenRight]&&!b[home][1]&&!b[home][2]&&!b[home][3]&&b[home][0]?.type==='r'&&b[home][0].color===color&&!attacked(b,home,3,enemy)&&!attacked(b,home,2,enemy))out.push({from:[r,f],to:[home,2],castle:'q'});
      }
    }else{
      const dirs=p.type==='b'?[[-1,-1],[-1,1],[1,-1],[1,1]]:p.type==='r'?[[-1,0],[1,0],[0,-1],[0,1]]:[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for(const[dr,df]of dirs){let rr=r+dr,ff=f+df;while(inside(rr,ff)){if(!b[rr][ff])out.push({from:[r,f],to:[rr,ff]});else{if(b[rr][ff].color!==color)out.push({from:[r,f],to:[rr,ff]});break;}rr+=dr;ff+=df;}}
    }
  }return out;
}
function applyMove(s,m,promotionType='q'){
  const b=s.board,[[r,f],[rr,ff]]= [m.from,m.to],piece=b[r][f],captured=m.enPassant?b[rr+(piece.color==='w'?1:-1)][ff]:b[rr][ff];
  b[rr][ff]=piece;b[r][f]=null;if(m.enPassant)b[rr+(piece.color==='w'?1:-1)][ff]=null;
  if(m.promotion|| (piece.type==='p'&&(rr===0||rr===7)))b[rr][ff]={type:promotionType,color:piece.color};
  if(m.castle){const home=rr,rookFrom=m.castle==='k'?7:0,rookTo=m.castle==='k'?5:3;b[home][rookTo]=b[home][rookFrom];b[home][rookFrom]=null;}
  const rights={...s.rights};if(piece.type==='k'){rights[piece.color+'k']=false;rights[piece.color+'q']=false;}
  if(piece.type==='r'){if(r===7&&f===0)rights.wq=false;if(r===7&&f===7)rights.wk=false;if(r===0&&f===0)rights.bq=false;if(r===0&&f===7)rights.bk=false;}
  if(captured?.type==='r'){if(rr===7&&ff===0)rights.wq=false;if(rr===7&&ff===7)rights.wk=false;if(rr===0&&ff===0)rights.bq=false;if(rr===0&&ff===7)rights.bk=false;}
  s.rights=rights;s.ep=m.double?[(r+rr)/2,f]:null;s.turn=opposite(piece.color);return {piece,captured};
}
function legalMoves(s,color=s.turn){const result=[];for(const m of pseudoMoves(s,color)){const t={board:cloneBoard(s.board),turn:color,rights:{...s.rights},ep:s.ep&&[...s.ep]};applyMove(t,m);if(!inCheck(t.board,color))result.push(m);}return result;}
function sanForMove(s,m,legalBefore){
  const p=s.board[m.from[0]][m.from[1]],target=m.enPassant||s.board[m.to[0]][m.to[1]],capture=!!target;
  if(m.castle)return m.castle==='k'?'O-O':'O-O-O';let text=p.type==='p'?'':p.type.toUpperCase();
  if(p.type!=='p'){
    const rivals=legalBefore.filter(x=>!(x.from[0]===m.from[0]&&x.from[1]===m.from[1])&&x.to[0]===m.to[0]&&x.to[1]===m.to[1]&&s.board[x.from[0]][x.from[1]]?.type===p.type);
    if(rivals.length){const sameFile=rivals.some(x=>x.from[1]===m.from[1]),sameRank=rivals.some(x=>x.from[0]===m.from[0]);text+=!sameFile?FILES[m.from[1]]:!sameRank?String(8-m.from[0]):algebraic(m.from);}
  }else if(capture)text+=FILES[m.from[1]];
  if(capture)text+='x';text+=algebraic(m.to);if(m.promotion)text+='='+((m.promotionType||'q').toUpperCase());return text;
}
function snapshot(){return{board:cloneBoard(state.board),turn:state.turn,rights:{...state.rights},ep:state.ep&&[...state.ep]};}
function restore(s){state.board=cloneBoard(s.board);state.turn=s.turn;state.rights={...s.rights};state.ep=s.ep&&[...s.ep];}

// Three-dimensional room and chess set
const mount=document.querySelector('#board-canvas');
const scene=new THREE.Scene();scene.background=new THREE.Color('#17201b');scene.fog=new THREE.Fog('#17201b',17,30);
const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(7.7,10.6,11.8);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;mount.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.15,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=9;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.22;controls.enablePan=false;
scene.add(new THREE.HemisphereLight('#e5e1d3','#35352a',2.1));
const keyLight=new THREE.DirectionalLight('#fff0d6',3.3);keyLight.position.set(-5,10,6);scene.add(keyLight);const fill=new THREE.DirectionalLight('#c2d5c9',1.25);fill.position.set(6,5,-7);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#17201b',roughness:.93}));ground.rotation.x=-Math.PI/2;ground.position.y=-.3;scene.add(ground);
const table=new THREE.Group();scene.add(table);
const wood=new THREE.Mesh(new THREE.BoxGeometry(8.45,.34,8.45),new THREE.MeshStandardMaterial({color:'#72583b',roughness:.38,metalness:.06}));wood.position.y=-.12;table.add(wood);
const edge=new THREE.Mesh(new THREE.BoxGeometry(8.23,.12,8.23),new THREE.MeshStandardMaterial({color:'#b29260',roughness:.33,metalness:.16}));edge.position.y=.045;table.add(edge);
const tiles=[],pieceMeshes=new Map(),highlights=new THREE.Group();table.add(highlights);const piecesGroup=new THREE.Group();table.add(piecesGroup);
const lightTile=new THREE.MeshStandardMaterial({color:'#d8cbb1',roughness:.46,metalness:.025});const darkTile=new THREE.MeshStandardMaterial({color:'#536856',roughness:.48,metalness:.02});
const tileGeo=new THREE.BoxGeometry(1, .12, 1);
for(let r=0;r<8;r++)for(let f=0;f<8;f++){const tile=new THREE.Mesh(tileGeo,(r+f)%2?darkTile:lightTile);tile.position.set(f-3.5,.105,r-3.5);tile.userData={r,f};table.add(tile);tiles.push(tile);}
const under=new THREE.Mesh(new THREE.BoxGeometry(8.1,.035,8.1),new THREE.MeshStandardMaterial({color:'#202a22',roughness:.5}));under.position.y=.015;table.add(under);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let resizeObserver;
const matWhite=(color,metalness=.1,roughness=.24)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const whiteMat=matWhite('#eee4cc',.23,.21),blackMat=matWhite('#222923',.42,.22),goldMat=matWhite('#b99a61',.68,.22),darkGold=matWhite('#846b43',.64,.3);
const profile=[new THREE.Vector2(0,0),new THREE.Vector2(.29,0),new THREE.Vector2(.34,.045),new THREE.Vector2(.31,.09),new THREE.Vector2(.23,.13),new THREE.Vector2(.18,.22),new THREE.Vector2(.15,.32),new THREE.Vector2(.2,.38),new THREE.Vector2(.23,.42),new THREE.Vector2(.21,.46),new THREE.Vector2(.12,.49),new THREE.Vector2(.09,.53)];
const latheGeo=new THREE.LatheGeometry(profile,32);
const sphereGeo=new THREE.SphereGeometry(1,20,16);
function addPieceGeometry(g,type,color){
  const material=color==='w'?whiteMat:blackMat,trim=color==='w'?goldMat:darkGold;
  const base=new THREE.Mesh(latheGeo,material);g.add(base);
  const addCylinder=(radTop,radBot,height,y,mat=material,segments=24)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radTop,radBot,height,segments),mat);mesh.position.y=y;g.add(mesh);return mesh;};
  const addSphere=(x,y,z,sx,sy,sz,mat=material)=>{const m=new THREE.Mesh(sphereGeo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;};
  if(type==='p') {addCylinder(.13,.16,.13,.55);addSphere(0,.73,0,.155,.16,.155,material);}
  if(type==='r') {addCylinder(.19,.21,.17,.57,trim);addCylinder(.24,.18,.1,.7);const crown=new THREE.Mesh(new THREE.BoxGeometry(.4,.19,.4),material);crown.position.y=.82;g.add(crown);for(let i=0;i<4;i++){const crenel=new THREE.Mesh(new THREE.BoxGeometry(.095,.12,.095),material);crenel.position.set(i<2?-.13:.13,.94,i%2?-.13:.13);g.add(crenel);}}
  if(type==='n'){
    addCylinder(.16,.18,.11,.58,trim);
    const shape=new THREE.Shape();shape.moveTo(-.19,0);shape.lineTo(-.16,.22);shape.lineTo(-.28,.39);shape.lineTo(-.25,.62);shape.lineTo(-.12,.55);shape.lineTo(-.02,.72);shape.lineTo(.18,.69);shape.lineTo(.26,.55);shape.lineTo(.17,.43);shape.lineTo(.11,.2);shape.lineTo(.18,0);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});geo.computeVertexNormals();const horse=new THREE.Mesh(geo,material);horse.position.set(0,.53,-.075);g.add(horse);
    const eye=addSphere(.045,1.08,-.09,.025,.026,.025,trim);eye.position.x=.08;
  }
  if(type==='b') {addCylinder(.13,.19,.1,.57,trim);addSphere(0,.72,0,.12,.17,.12);addCylinder(.06,.13,.2,.91,material);const tip=addSphere(0,1.05,0,.075,.08,.075,trim);}
  if(type==='q') {addCylinder(.15,.21,.13,.57,trim);addCylinder(.105,.16,.24,.75);addSphere(0,.94,0,.18,.12,.18,material);for(let i=0;i<6;i++){const a=i*Math.PI/3;addSphere(Math.cos(a)*.17,1.06,Math.sin(a)*.17,.055,.07,.055,trim);}}
  if(type==='k') {addCylinder(.15,.21,.13,.57,trim);addCylinder(.09,.15,.29,.77);addSphere(0,.96,0,.145,.12,.145,material);const stem=new THREE.Mesh(new THREE.BoxGeometry(.08,.38,.08),trim);stem.position.y=1.19;g.add(stem);const cross=new THREE.Mesh(new THREE.BoxGeometry(.29,.075,.08),trim);cross.position.y=1.27;g.add(cross);}
  // Small, bright maker's ring around the foot of every piece.
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.014,8,32),trim);ring.rotation.x=Math.PI/2;ring.position.y=.045;g.add(ring);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
}
function makePiece(type,color){const g=new THREE.Group();addPieceGeometry(g,type,color);g.userData={type,color};return g;}
function syncPieces(){piecesGroup.clear();pieceMeshes.clear();for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=state.board[r][f];if(!p)continue;const obj=makePiece(p.type,p.color);obj.position.set(f-3.5,.17,r-3.5);obj.rotation.y=state.flipped?Math.PI:0;piecesGroup.add(obj);pieceMeshes.set(`${r},${f}`,obj);}}
function setFlipped(){table.rotation.y=state.flipped?Math.PI:0;document.querySelector('.files').classList.toggle('reversed',state.flipped);document.querySelector('.ranks').classList.toggle('reversed',state.flipped);}
function resize(){const rect=mount.getBoundingClientRect();const w=Math.max(1,rect.width),h=Math.max(1,rect.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);resize();

let lastMove=null,toastTimer;
const statusEl=document.querySelector('#game-status'),turnEl=document.querySelector('#turn-name'),turnPieceEl=document.querySelector('#turn-piece'),moveListEl=document.querySelector('#move-list');
function showToast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100);}
function playTone(freq=520,duration=.08){if(!state.sound)return;try{const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),gain=ctx.createGain();o.frequency.value=freq;o.type='sine';gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(gain);gain.connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration);}catch{}}
function refreshHighlights(){highlights.clear();const addSquare=(r,f,color,opacity)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(.94,.94),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(f-3.5,.171,r-3.5);highlights.add(m);};
  if(lastMove){addSquare(...lastMove.from,'#cfb26e',.27);addSquare(...lastMove.to,'#cfb26e',.33);}
  if(state.selected){addSquare(...state.selected,'#d7c88f',.48);for(const m of state.legal){const [r,f]=m.to,occupied=state.board[r][f]||m.enPassant;const marker=new THREE.Mesh(occupied?new THREE.RingGeometry(.34,.42,32):new THREE.CircleGeometry(.13,24),new THREE.MeshBasicMaterial({color:'#d8cfaa',transparent:true,opacity:occupied?.84:.68,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.set(f-3.5,.18,r-3.5);highlights.add(marker);}}
  const king=findKing(state.board,state.turn);if(king&&inCheck(state.board,state.turn))addSquare(...king,'#bd5948',.56);
}
function renderMoves(){const count=state.moves.length;document.querySelector('#move-count').textContent=`${count} PLY`;if(!count){moveListEl.innerHTML='<div class="empty-moves"><span>♜</span><p>The board is set.<br>Make your opening move.</p></div>';return;}moveListEl.innerHTML='';for(let i=0;i<count;i+=2){const row=document.createElement('div');row.className='move-row';row.innerHTML=`<span class="move-no">${String(i/2+1).padStart(2,'0')}.</span><span>${state.moves[i]?.san||''}</span><span>${state.moves[i+1]?.san||''}</span>`;if(i+2>=count)row.lastElementChild.classList.add('last');if(i+1===count)row.children[1].classList.add('last');moveListEl.appendChild(row);}moveListEl.scrollTop=moveListEl.scrollHeight;}
function updateUI(){
  turnEl.textContent=state.turn==='w'?'White':'Black';turnPieceEl.textContent=state.turn==='w'?'♙':'♟';turnPieceEl.style.color=state.turn==='w'?'#eee7d7':'#9d9a88';
  const checked=inCheck(state.board,state.turn),moves=legalMoves(state);let text=state.turn==='w'?'Your move':'House to move';statusEl.classList.toggle('check',checked);
  if(!moves.length){state.gameOver=true;if(checked){text=`Checkmate · ${state.turn==='w'?'Black':'White'} wins`;showToast(text);}else{text='Draw · Stalemate';showToast(text);}}
  else if(checked)text='Check';else if(state.thinking)text='Considering…';
  statusEl.lastElementChild.textContent=text;document.querySelector('#undo-button').disabled=!state.history.length||state.thinking;
  document.querySelector('#opponent-name').textContent=state.local?'Player Two':'The House';document.querySelector('#mode-label').textContent=state.local?'LOCAL · TWO PLAYER':'COMPUTER · CASUAL';
  refreshHighlights();renderMoves();
}
function commitMove(move,promotion='q'){
  const legalBefore=legalMoves(state),san=sanForMove(state,move,legalBefore),before=snapshot();
  applyMove(state,move,promotion);const check=inCheck(state.board,state.turn);const remaining=legalMoves(state);const notation=san+(check?(remaining.length?' +':'#'):'');
  state.history.push({before,move:{...move,from:[...move.from],to:[...move.to]},san:notation});state.moves.push({san:notation,color:opposite(state.turn)});lastMove=move;state.selected=null;state.legal=[];state.gameOver=false;
  syncPieces();updateUI();playTone(check?720:move.castle?490:580,.07);
  if(!state.local&&state.turn==='b'&&!state.gameOver){state.thinking=true;updateUI();setTimeout(computerTurn,300);}
}
function handleSquare(r,f){if(state.gameOver||state.thinking||state.pendingPromotion)return;
  const piece=state.board[r][f];
  if(state.selected){const found=state.legal.find(m=>m.to[0]===r&&m.to[1]===f);if(found){if(found.promotion){openPromotion(found);return;}commitMove(found);return;}
    if(piece?.color===state.turn){state.selected=[r,f];state.legal=legalMoves(state).filter(m=>m.from[0]===r&&m.from[1]===f);refreshHighlights();return;}
    state.selected=null;state.legal=[];refreshHighlights();return;
  }
  if(piece&&piece.color===state.turn){state.selected=[r,f];state.legal=legalMoves(state).filter(m=>m.from[0]===r&&m.from[1]===f);refreshHighlights();playTone(420,.04);}
}
function openPromotion(move){state.pendingPromotion=move;const modal=document.querySelector('#promotion-modal'),options=document.querySelector('#promotion-options');options.innerHTML='';for(const type of ['q','r','b','n']){const button=document.createElement('button');button.textContent=({q:'♛',r:'♜',b:'♝',n:'♞'})[type];button.setAttribute('aria-label',`Promote to ${type}`);button.onclick=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');state.pendingPromotion=null;commitMove({...move,promotionType:type},type);};options.appendChild(button);}modal.classList.add('open');modal.setAttribute('aria-hidden','false');}

function evaluate(s){let score=0;for(let r=0;r<8;r++)for(let f=0;f<8;f++){const p=s.board[r][f];if(!p)continue;const sign=p.color==='b'?1:-1;let positional=0;const center=3.5-(Math.abs(3.5-r)+Math.abs(3.5-f))*.22;if(p.type==='p')positional=(6-r)*3;if(p.type==='n'||p.type==='b')positional=center*5;if(p.type==='k'&&r===0)positional=8;score+=sign*(VALUES[p.type]+positional);}return score;}
function search(s,depth,alpha,beta){const moves=legalMoves(s);if(!moves.length)return inCheck(s.board,s.turn)?(s.turn==='b'?-30000-depth:30000+depth):0;if(depth===0)return evaluate(s);moves.sort((a,b)=>{const cap=m=>((s.board[m.to[0]][m.to[1]]?VALUES[s.board[m.to[0]][m.to[1]].type]:0)+(m.promotion?800:0));return cap(b)-cap(a);});if(s.turn==='b'){let best=-Infinity;for(const m of moves){const t={board:cloneBoard(s.board),turn:s.turn,rights:{...s.rights},ep:s.ep&&[...s.ep]};applyMove(t,m);best=Math.max(best,search(t,depth-1,alpha,beta));alpha=Math.max(alpha,best);if(beta<=alpha)break;}return best;}let best=Infinity;for(const m of moves){const t={board:cloneBoard(s.board),turn:s.turn,rights:{...s.rights},ep:s.ep&&[...s.ep]};applyMove(t,m);best=Math.min(best,search(t,depth-1,alpha,beta));beta=Math.min(beta,best);if(beta<=alpha)break;}return best;}
function computerTurn(){if(state.local||state.turn!=='b'||state.gameOver){state.thinking=false;updateUI();return;}const legal=legalMoves(state);let best=-Infinity,choices=[];for(const m of legal){const t={board:cloneBoard(state.board),turn:state.turn,rights:{...state.rights},ep:state.ep&&[...state.ep]};applyMove(t,m);const score=search(t,1,-Infinity,Infinity)+(Math.random()-.5)*8;if(score>best+.01){best=score;choices=[m];}else if(Math.abs(score-best)<.01)choices.push(m);}state.thinking=false;if(choices.length)commitMove(choices[Math.floor(Math.random()*choices.length)]);}
function undoMove(){if(!state.history.length||state.thinking)return;const count=state.local?1:Math.min(2,state.history.length);for(let i=0;i<count;i++){const item=state.history.pop();restore(item.before);state.moves.pop();}lastMove=state.history.at(-1)?.move||null;state.selected=null;state.legal=[];state.gameOver=false;syncPieces();updateUI();playTone(360,.08);}
function newGame(){state.board=initialBoard();state.turn='w';state.rights={wk:true,wq:true,bk:true,bq:true};state.ep=null;state.history=[];state.moves=[];state.selected=null;state.legal=[];state.gameOver=false;state.thinking=false;state.pendingPromotion=null;lastMove=null;syncPieces();updateUI();showToast('A fresh game begins.');}

mount.addEventListener('pointerdown',e=>{mount.dataset.downX=e.clientX;mount.dataset.downY=e.clientY;});
mount.addEventListener('click',e=>{const dx=Math.abs(e.clientX-Number(mount.dataset.downX||e.clientX)),dy=Math.abs(e.clientY-Number(mount.dataset.downY||e.clientY));if(dx+dy>6)return;const rect=mount.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(tiles,false)[0];if(hit){const {r,f}=hit.object.userData;const rr=state.flipped?7-r:r,ff=state.flipped?7-f:f;handleSquare(rr,ff);}});
mount.addEventListener('pointermove',e=>{if(e.buttons)return;const rect=mount.getBoundingClientRect();pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);mount.style.cursor=raycaster.intersectObjects(tiles,false).length?'pointer':'grab';});
document.querySelector('#flip-board').addEventListener('click',()=>{state.flipped=!state.flipped;setFlipped();syncPieces();refreshHighlights();});
document.querySelector('#mode-toggle').addEventListener('click',e=>{state.local=!state.local;const btn=e.currentTarget;btn.classList.toggle('local',state.local);document.querySelector('#mode-title').textContent=state.local?'Playing locally':'Playing the computer';btn.querySelector('small').textContent=state.local?'Switch to computer opponent':'Switch to local two-player';updateUI();});
document.querySelector('#undo-button').addEventListener('click',undoMove);
document.querySelector('#new-game').addEventListener('click',newGame);
document.querySelector('#sound-toggle').addEventListener('click',e=>{state.sound=!state.sound;e.currentTarget.textContent=state.sound?'♫':'♩';e.currentTarget.title=state.sound?'Sound on':'Sound off';if(state.sound)playTone(520);});

syncPieces();setFlipped();updateUI();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();

