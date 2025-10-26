// Inisialisasi Peta
const map = L.map('map').setView([-2.8, 104.8], 6);
let baseLayers = {
  topografi: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
  satellite: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'),
  street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
};
baseLayers.topografi.addTo(map);

let equipments = [];
let currentEquipmentIndex = null;

// Fungsi buat ikon excavator dengan label di atas
function createExcavatorIcon(label, size = 50) {
  return L.divIcon({
    html: `
      <div style="position: relative;">
        <div style="
          position: absolute; top: -18px; left: 50%;
          transform: translateX(-50%);
          background: #2ecc71; color: white;
          font-size: 12px; font-weight: bold;
          padding: 2px 5px; border-radius: 10px;
        ">${label}</div>
        <img src="img/excavator.png" style="width:${size}px;">
      </div>
    `,
    className: 'excavator-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

// Warna jalur
function getColor(i) {
  const colors = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6'];
  return colors[i % colors.length];
}

// Tambah alat berat baru
document.getElementById('addEquipment').addEventListener('click', () => {
  const id = equipments.length + 1;
  const eq = {
    id,
    points: [],
    markers: [],
    polyline: L.polyline([], { color: getColor(id), weight: 4 }).addTo(map),
    excavatorMarker: null,
    isMoving: false,
    animationFrame: null,
    progress: 0
  };
  equipments.push(eq);
  currentEquipmentIndex = equipments.length - 1;

  // Tambah ke dropdown
  const select = document.getElementById('equipmentSelect');
  const opt = document.createElement('option');
  opt.value = currentEquipmentIndex;
  opt.text = `Excavator ${id}`;
  opt.selected = true;
  select.appendChild(opt);

  createCard(eq);
  updateStatus(`Excavator ${id} ditambahkan.`);
  updateInfo(eq);
});

// Buat card excavator di sidebar
function createCard(eq) {
  const div = document.createElement('div');
  div.className = 'equipment-card';
  div.id = `eq-${eq.id}`;
  div.innerHTML = `
    <h3>🚜 Excavator ${eq.id}</h3>
    <div>
      <button class="btn-card" onclick="addPoint(${eq.id})">➕ Titik</button>
      <button class="btn-card" onclick="startMove(${eq.id})">▶️ Start</button>
      <button class="btn-card" onclick="stopMove(${eq.id})">⏸️ Stop</button>
      <button class="btn-card" onclick="deleteEq(${eq.id})">❌ Hapus</button>
    </div>
    <div class="card-info" id="info-${eq.id}">Titik: 0 | Jarak: 0</div>
  `;
  document.getElementById('equipmentList').appendChild(div);
}

// Tambah titik ke peta
function addPoint(id) {
  const eq = equipments.find(e => e.id === id);
  map.once('click', e => {
    const latlng = e.latlng;
    eq.points.push(latlng);
    const marker = L.marker(latlng).addTo(map);
    eq.markers.push(marker);
    eq.polyline.addLatLng(latlng);
    updateInfo(eq);
  });
  updateStatus(`Klik di peta untuk menambah titik Excavator ${id}`);
}

// Hitung & tampilkan info
function updateInfo(eq) {
  let dist = 0;
  for (let i = 1; i < eq.points.length; i++) {
    dist += map.distance(eq.points[i-1], eq.points[i]);
  }
  document.getElementById(`info-${eq.id}`).textContent = 
    `Titik: ${eq.points.length} | Jarak: ${dist.toFixed(2)}`;
  document.getElementById('totalPoints').textContent = eq.points.length;
  document.getElementById('totalDistance').textContent = dist.toFixed(2);
}

// Mulai gerak
function startMove(id) {
  const eq = equipments.find(e => e.id === id);
  if (eq.points.length < 2) return alert("Tambahkan minimal 2 titik!");
  eq.isMoving = true;
  eq.progress = 0;

  if (!eq.excavatorMarker) {
    eq.excavatorMarker = L.marker(eq.points[0], {
      icon: createExcavatorIcon(`EX-${eq.id}`)
    }).addTo(map);
  }

  function animate() {
    if (!eq.isMoving) return;
    eq.progress += 0.001;
    if (eq.progress > 1) eq.progress = 0;
    const line = turf.lineString(eq.points.map(p => [p.lng, p.lat]));
    const dist = turf.length(line);
    const along = turf.along(line, eq.progress * dist);
    const [lng, lat] = along.geometry.coordinates;
    eq.excavatorMarker.setLatLng([lat, lng]);
    eq.animationFrame = requestAnimationFrame(animate);
  }
  animate();
}

// Stop per excavator
function stopMove(id) {
  const eq = equipments.find(e => e.id === id);
  eq.isMoving = false;
  cancelAnimationFrame(eq.animationFrame);
}

// Hapus excavator
function deleteEq(id) {
  const index = equipments.findIndex(e => e.id === id);
  const eq = equipments[index];
  eq.markers.forEach(m => map.removeLayer(m));
  map.removeLayer(eq.polyline);
  if (eq.excavatorMarker) map.removeLayer(eq.excavatorMarker);
  equipments.splice(index, 1);
  document.getElementById(`eq-${id}`).remove();
  updateStatus(`Excavator ${id} dihapus.`);
}

// Tombol global
document.getElementById('stopMove').addEventListener('click', () => {
  equipments.forEach(eq => {
    eq.isMoving = false;
    cancelAnimationFrame(eq.animationFrame);
  });
  updateStatus("Semua alat dihentikan.");
});

document.getElementById('reset').addEventListener('click', () => {
  equipments.forEach(eq => {
    eq.markers.forEach(m => map.removeLayer(m));
    map.removeLayer(eq.polyline);
    if (eq.excavatorMarker) map.removeLayer(eq.excavatorMarker);
  });
  equipments = [];
  document.getElementById('equipmentList').innerHTML = '';
  document.getElementById('equipmentSelect').innerHTML = 
    '<option value="" disabled selected>Pilih Alat Berat</option>';
  updateStatus("Semua data direset.");
});

// Dropdown excavator
document.getElementById('equipmentSelect').addEventListener('change', e => {
  const eq = equipments[e.target.value];
  if (eq) updateInfo(eq);
});

// Ganti jenis peta
document.getElementById('mapType').addEventListener('change', e => {
  map.removeLayer(baseLayers.topografi);
  map.removeLayer(baseLayers.satellite);
  map.removeLayer(baseLayers.street);
  baseLayers[e.target.value].addTo(map);
});

function updateStatus(msg) {
  document.getElementById('status').textContent = msg;
}
