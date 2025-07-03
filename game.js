// ----------- GAME STATE ----------
let state = {
  coins: 100,
  energy: 100,
  gems: 100,
  fields: [{empty: true},{empty: true},{empty: true},{empty: true},{empty: true}],
  depot: {}, // ürün: miktar
  buildings: [],
  crops: [
    {name: "Buğday", emoji:"🌾", base:10, price: 5},
    {name: "Mısır", emoji:"🌽", base:25, price: 8},
    {name: "Domates", emoji:"🍅", base:45, price: 14},
    {name: "Kabak", emoji:"🎃", base:80, price: 20},
    {name: "Çilek", emoji:"🍓", base:120, price: 32}
  ],
  cropPlanting: null,
  well: {has:false,water:0,lastTick:Date.now()},
  mill: {has:false},
  oven: {has:false}
};

// --------- UI UPDATERS -----------
function updateBars() {
  document.getElementById('energy-bar').innerText = `⚡ ${state.energy}`;
  document.getElementById('coin-bar').innerText = `💰 ${state.coins}`;
  document.getElementById('gem-bar').innerText = `💎 ${state.gems}`;
}
function renderFields() {
  const grid = document.getElementById('fields-grid');
  grid.innerHTML = "";
  state.fields.forEach((field, i) => {
    const div = document.createElement('div');
    div.className = "field";
    if(field.locked) div.classList.add('locked');
    if(field.empty) div.innerHTML = "Boş Tarla 🟫";
    else if(field.growing) {
      div.innerHTML = `<span>${field.crop.emoji} ${field.crop.name}
      <br><span class="timer">${Math.max(0,field.crop.time-field.progress)} sn</span></span>`;
      const prog = document.createElement('div');
      prog.className = "progress";
      prog.style.width = `${Math.max(3,field.progress/field.crop.time*100)}%`;
      div.appendChild(prog);
    }
    else if(field.ready) {
      div.innerHTML = `${field.crop.emoji} ${field.crop.name} ✅<br><button onclick="harvestField(${i})">Hasat Et</button>`;
    }
    div.onclick = () => { if(field.empty) openPlantModal(i); };
    grid.appendChild(div);
  });
}
function renderBuildings() {
  const bar = document.getElementById('buildings-bar');
  bar.innerHTML = "";
  state.buildings.forEach((b, idx) => {
    const d = document.createElement('div');
    d.className = "building";
    if(b.type === 'well') {
      d.innerHTML = `🚰 <span>Su Kuyusu</span><div class="badge" title="Mevcut su">${state.well.water}</div>`;
      d.onclick = ()=>openWellModal();
    } else if(b.type === 'mill') {
      d.innerHTML = `🏭 <span>Değirmen</span>`;
      d.onclick = ()=>openMillModal();
    } else if(b.type === 'oven') {
      d.innerHTML = `🔥 <span>Fırın</span>`;
      d.onclick = ()=>openOvenModal();
    }
    bar.appendChild(d);
  });
}
function updateDepot() {
  const list = document.getElementById('depot-list');
  if(Object.keys(state.depot).length==0) list.innerHTML = "Depo boş.";
  else {
    list.innerHTML = "";
    Object.entries(state.depot).forEach(([item,amount])=>{
      let price = getSellPrice(item);
      list.innerHTML += `
        <div class="depot-list-item">
          <span>${item} x${amount}</span>
          <span>
            <button onclick="sellItem('${item}')">Sat (${price} coin)</button>
          </span>
        </div>
      `;
    });
  }
}
function getSellPrice(item) {
  if(item==='Un') return 18;
  if(item==='Ekmek') return 35;
  if(item==='Su') return 3;
  let c = state.crops.find(c=>c.name===item);
  return c ? c.price : 1;
}

// -------- MODALS -----------
function openStore() { openModal('store-modal'); }
function openDepot() { updateDepot(); openModal('depot-modal'); }
function openTasks() { openModal('task-modal'); }
function openPlantModal(fieldIdx) {
  state.cropPlanting = fieldIdx;
  const options = document.getElementById('plant-options');
  options.innerHTML = "";
  state.crops.forEach((crop, i)=>{
    let extra = i*5;
    let totalTime = crop.base + extra;
    options.innerHTML += `<button style="margin:3px;" onclick="plantCrop(${i})">${crop.emoji} ${crop.name}<br><small>${totalTime} sn / ${crop.price} coin</small></button>`;
  });
  openModal('plant-modal');
}
function openWellModal() {
  openModal('well-modal');
  document.getElementById('well-water').innerText = state.well.water;
  document.getElementById('collect-water-btn').disabled = state.well.water==0;
}
function openMillModal() {
  openModal('mill-modal');
  document.getElementById('mill-wheat').innerText = state.depot["Buğday"]||0;
  document.getElementById('mill-flour').innerText = state.depot["Un"]||0;
}
function openOvenModal() {
  openModal('oven-modal');
  document.getElementById('oven-flour').innerText = state.depot["Un"]||0;
  document.getElementById('oven-water').innerText = state.depot["Su"]||0;
  document.getElementById('oven-bread').innerText = state.depot["Ekmek"]||0;
}
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ----------- GAME LOGIC -----------
function buyField() {
  let idx = state.fields.findIndex(f=>f.locked);
  if(idx<0) idx = state.fields.findIndex(f=>f.empty);
  if(idx < 0) return alert("Tüm tarlalar zaten açık!");
  if(state.coins < 10) return alert("Yeterli coin yok!");
  state.coins -= 10;
  state.fields[idx] = {empty: true};
  renderFields(); updateBars();
}
function buyBuilding(type) {
  let price = type=='mill'?30:type=='well'?20:40;
  if(state.coins < price) return alert("Yeterli coin yok!");
  if(state.buildings.find(b=>b.type===type)) return alert("Bu bina zaten var!");
  state.coins -= price;
  state.buildings.push({type});
  if(type=="well") state.well.has = true;
  if(type=="mill") state.mill.has = true;
  if(type=="oven") state.oven.has = true;
  renderBuildings(); updateBars();
}
function plantCrop(cropIdx) {
  closeModal('plant-modal');
  let fidx = state.cropPlanting;
  if(state.energy < 1) return alert("Yeterli enerji yok!");
  let field = state.fields[fidx];
  if(!field.empty) return;
  let crop = {...state.crops[cropIdx]};
  let extra = cropIdx*5;
  crop.time = crop.base + extra;
  state.energy -= 1;
  if(state.gems > 0) {
    state.gems -= 1;
    state.fields[fidx] = {growing:false, ready:true, crop};
    renderFields(); updateBars();
    return;
  }
  state.fields[fidx] = {empty:false, growing:true, progress:0, crop};
  renderFields(); updateBars();
}
function harvestField(idx) {
  let field = state.fields[idx];
  let c = field.crop.name;
  state.depot[c] = (state.depot[c]||0) + 1;
  state.fields[idx] = {empty:true};
  renderFields(); updateDepot(); updateBars();
}
function sellItem(item) {
  if(state.depot[item]>0) {
    let price = getSellPrice(item);
    state.coins += price;
    state.depot[item] -= 1;
    if(state.depot[item]==0) delete state.depot[item];
    updateDepot(); updateBars();
  }
}
function collectWater() {
  if(state.well.water > 0) {
    state.depot["Su"] = (state.depot["Su"]||0) + state.well.water;
    state.well.water = 0;
    document.getElementById('well-water').innerText = 0;
    document.getElementById('collect-water-btn').disabled = true;
    renderBuildings();
    updateDepot();
  }
}
function produceFlour() {
  if((state.depot["Buğday"]||0) < 1) return alert("Yeterli buğday yok!");
  if(state.energy < 1) return alert("Yeterli enerji yok!");
  state.depot["Buğday"] -= 1;
  state.depot["Un"] = (state.depot["Un"]||0) + 1;
  state.energy -= 1;
  updateBars();
  openMillModal();
}
function produceBread() {
  if((state.depot["Un"]||0)<1) return alert("Yeterli un yok!");
  if((state.depot["Su"]||0)<1) return alert("Yeterli su yok!");
  if(state.energy < 1) return alert("Yeterli enerji yok!");
  state.depot["Un"] -= 1;
  state.depot["Su"] -= 1;
  state.depot["Ekmek"] = (state.depot["Ekmek"]||0) + 1;
  state.energy -= 1;
  updateBars();
  openOvenModal();
}

// Zamanlayıcı: tarlalar, kuyu
setInterval(()=>{
  // Kuyu: 30 saniyede 1 su biriktir (maks 10)
  if(state.well.has) {
    let now = Date.now();
    let elapsed = Math.floor((now - state.well.lastTick)/1000);
    if(elapsed >= 30 && state.well.water < 10) {
      let add = Math.min(Math.floor(elapsed/30), 10-state.well.water);
      state.well.water += add;
      state.well.lastTick = now - (elapsed%30)*1000;
      renderBuildings();
      let wellW = document.getElementById('well-water');
      if(wellW) wellW.innerText = state.well.water;
      let btn = document.getElementById('collect-water-btn');
      if(btn) btn.disabled = state.well.water==0;
    }
  }
  // Tarlalar: ürün ilerlet
  state.fields.forEach((field,i)=>{
    if(field.growing) {
      field.progress = (field.progress||0)+1;
      if(field.progress >= field.crop.time) {
        field.growing = false; field.ready = true;
      }
    }
  });
  renderFields();
}, 1000);

// --------- INIT -----------
function init() {
  // 5 tarladan fazlasını açmak için locked ekleyebilirsin
  while(state.fields.length < 5) state.fields.push({locked:true});
  renderFields();
  renderBuildings();
  updateBars();
}
init();