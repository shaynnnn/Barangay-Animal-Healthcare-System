/* Shared community dashboard. Uses safe, aggregate/public collections only. */
(function () {
  "use strict";
  if (typeof firebase === "undefined" || !firebase.firestore) return;
  const store = firebase.firestore();
  const byId = id => document.getElementById(id);
  const escape = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateText = value => {
    if (!value) return "Date to be announced";
    if (typeof value === "string") return value;
    if (value.toDate) return value.toDate().toLocaleDateString();
    return "";
  };
  function setStat(id, value) { const el=byId(id); if(el) el.textContent = Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0"; }
  function renderChart(stats) {
    const target=byId("dashboardChart"); if(!target)return;
    const items=[ ["Registered pets",Number(stats.registeredPets)||0], ["Vaccinations",Number(stats.vaccinations)||0], ["Bite reports",Number(stats.biteCases)||0], ["Adoptions",Number(stats.availableAdoptions)||0] ];
    const max=Math.max(1,...items.map(x=>x[1]));
    target.innerHTML=items.map(([label,val])=>`<div class="chart-row"><span>${escape(label)}</span><div class="chart-track"><div class="chart-fill" style="width:${Math.max(val>0?3:0,val/max*100)}%"></div></div><span class="chart-value">${val.toLocaleString()}</span></div>`).join("");
  }
  function loadStats() {
    // An admin-maintained aggregate document avoids exposing individual private records.
    store.collection("dashboardStats").doc("summary").onSnapshot(doc=>{
      const data=doc.exists?doc.data():{};
      setStat("statPets",data.registeredPets||0); setStat("statVaccinations",data.vaccinations||0); setStat("statBites",data.biteCases||0); setStat("statAdoptions",data.availableAdoptions||0); setStat("statMissions",data.activeMissions||0); renderChart(data);
      const owners=byId("statOwners"); if(owners) owners.textContent=(data.owners != null ? Number(data.owners).toLocaleString()+" Owners" : "Community records");
      const pendingVax=byId("statVaccinationPending"); if(pendingVax) pendingVax.textContent=(data.pendingVaccinations != null ? Number(data.pendingVaccinations).toLocaleString()+" Pending" : "Vaccination records");
      const pendingBites=byId("statBitePending"); if(pendingBites) pendingBites.textContent=(data.pendingBiteCases != null ? Number(data.pendingBiteCases).toLocaleString()+" Pending" : "Bite reports");
      const missions=byId("statMissionCount"); if(missions) missions.textContent=(data.activeMissions != null ? Number(data.activeMissions).toLocaleString()+" Missions" : "Missions");
    },err=>{console.warn("Dashboard statistics unavailable:",err); const t=byId("dashboardChart");if(t)t.innerHTML='<p class="dashboard-muted">Statistics will appear after the administrator sets up the shared summary.</p>';});
  }
  function loadMissions() {
    const target=byId("dashboardMissions");if(!target)return;
    store.collection("missions").where("status","==","Approved").onSnapshot(snapshot=>{
      const now=new Date(); const rows=[]; snapshot.forEach(doc=>{const m=doc.data();if(!m.eventDate || new Date(m.eventDate+"T23:59:59")>=now)rows.push({id:doc.id,...m});});
      rows.sort((a,b)=>String(a.eventDate||"").localeCompare(String(b.eventDate||"")));
      target.innerHTML=rows.length?rows.slice(0,4).map(m=>`<article class="dashboard-list-item"><span class="item-meta">${escape(m.category||"Community mission")} · ${escape(dateText(m.eventDate))}</span><h4>${escape(m.eventName||"Animal welfare activity")}</h4><p>📍 ${escape(m.location||"Location to be announced")}</p><p>${escape(m.description||"")}</p></article>`).join(""):'<p class="dashboard-muted">No upcoming approved missions yet.</p>';
    },err=>{console.warn("Mission list unavailable:",err);target.innerHTML='<p class="dashboard-muted">Upcoming missions are temporarily unavailable.</p>';});
  }
  function loadAdoptions() {
    const target=byId("dashboardAdoptions"); if(!target)return;
    store.collection("adoptions").onSnapshot(snapshot=>{
      const items=[];
      snapshot.forEach(doc=>{const a=doc.data();const status=String(a.status||"Available").trim().toLowerCase();if(["available","approved","published"].includes(status))items.push({id:doc.id,...a});});
      target.innerHTML=items.length?items.slice(0,2).map(a=>{
        const name=a.petName||a.name||"Animal looking for a home";
        const breed=a.breed||a.animalType||a.species||"Breed/type not specified";
        const age=a.age||a.petAge||"Age not specified";
        const sex=a.sex||a.gender||"Sex not specified";
        return `<article class="dashboard-list-item adoption-listing-item"><div class="adoption-listing-copy"><span class="item-meta">Adoption · Available</span><h4>${escape(name)}${sex&&sex!=="Sex not specified"?` (${escape(sex)})`:''}</h4><p>🐾 ${escape(breed)} · ${escape(age)}</p><p>${escape(a.description||a.notes||"Looking for a loving home.")}</p><a href="modules/adoption.html">View details →</a></div></article>`;
      }).join(""):'<p class="dashboard-muted">No available adoption listings yet.</p>';
    },err=>{console.warn("Adoption listings unavailable:",err);target.innerHTML='<p class="dashboard-muted">Adoption listings are temporarily unavailable.</p>';});
  }
  function loadActivity() {
    const target=byId("dashboardActivity");if(!target)return;
    store.collection("recentActivity").orderBy("createdAt","desc").limit(5).onSnapshot(snapshot=>{
      target.innerHTML=snapshot.empty?'<p class="dashboard-muted">Community updates will appear here.</p>':snapshot.docs.map(doc=>{const a=doc.data();return `<article class="dashboard-list-item"><span class="item-meta">${escape(a.category||"Community update")} · ${escape(dateText(a.createdAt))}</span><h4>${escape(a.title||"Community update")}</h4><p>${escape(a.description||"")}</p></article>`;}).join("");
    },err=>{console.warn("Activity unavailable:",err);target.innerHTML='<p class="dashboard-muted">Recent activity is temporarily unavailable.</p>';});
  }
  function start(){ if(byId("communityDashboard")){loadStats();loadMissions();loadAdoptions();loadActivity();} }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
