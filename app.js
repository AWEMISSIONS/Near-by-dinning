const $=id=>document.getElementById(id), STORAGE='nearby-dining-settings-v1';
const options={radius:5,sort:'recommended',cuisine:'',hideChains:"McDonald's"};
try{Object.assign(options,JSON.parse(localStorage.getItem(STORAGE)||'{}'))}catch{}
for(const [key,id] of [['radius','radius'],['sort','sort'],['cuisine','cuisine'],['hideChains','hideChains']])$(id).value=options[key];
function save(){for(const k of Object.keys(options))options[k]=$(k).value;try{localStorage.setItem(STORAGE,JSON.stringify(options))}catch{}}
for(const id of ['radius','sort','cuisine','hideChains'])$(id).addEventListener('change',save);
const rad=x=>x*Math.PI/180;
function miles(a,b){const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
async function geocode(q){const u='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(q);const r=await fetch(u,{headers:{'Accept-Language':'en'}});if(!r.ok)throw Error('Place lookup is temporarily unavailable.');const a=await r.json();if(!a.length)throw Error('We could not find that place. Try a nearby town or street address.');return{lat:Number(a[0].lat),lon:Number(a[0].lon),label:a[0].display_name}}
function meters(mi){return Math.round(mi*1609.344)}
function routeDistance(p,a,b){const ax=a.lon,ay=a.lat,bx=b.lon,by=b.lat,px=p.lon,py=p.lat,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1))),q={lat:ay+t*dy,lon:ax+t*dx};return miles(p,q)}
function safe(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function priceRank(t){const p=String(t||'').match(/\$+/);return p?p[0].length:99}
async function getPlaces(origin,destination){
 let query;
 if(destination){
  const south=Math.min(origin.lat,destination.lat)-.025,north=Math.max(origin.lat,destination.lat)+.025,west=Math.min(origin.lon,destination.lon)-.035,east=Math.max(origin.lon,destination.lon)+.035;
  query=`[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food|food_court"](${south},${west},${north},${east});way["amenity"~"restaurant|cafe|fast_food|food_court"](${south},${west},${north},${east}););out center tags;`;
 }else{
  const r=meters(Number($('radius').value));
  query=`[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food|food_court"](around:${r},${origin.lat},${origin.lon});way["amenity"~"restaurant|cafe|fast_food|food_court"](around:${r},${origin.lat},${origin.lon}););out center tags;`;
 }
 const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
 let lastError=null,successfulEmpty=false;
 for(const endpoint of endpoints){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query),signal:controller.signal});
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=JSON.parse(await res.text());
   const elements=data.elements||[];
   if(!elements.length){successfulEmpty=true;continue}
   return elements.map(e=>{const t=e.tags||{},lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;if(lat==null||lon==null)return null;return{id:e.type+'-'+e.id,name:t.name||t.brand||'Restaurant',lat:Number(lat),lon:Number(lon),cuisine:t.cuisine||'',brand:t.brand||'',amenity:t.amenity||'',address:[t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' '),phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',price:t.price||t['price:level']||'',opening:t.opening_hours||''}}).filter(Boolean);
  }catch(e){lastError=e}finally{clearTimeout(timer)}
 }
 if(successfulEmpty)return[];
 throw Error(lastError?.name==='AbortError'?'Restaurant data is taking too long to load. Please try again.':'Restaurant data is temporarily unavailable. Please try again in a moment.');
}
function cuisineMatch(p){const wanted=$('cuisine').value.toLowerCase();if(!wanted)return true;const value=(p.cuisine+' '+p.name+' '+p.amenity).toLowerCase();return value.includes(wanted.toLowerCase())||(wanted==='cafe'&&p.amenity==='cafe')||(wanted==='bbq'&&/(barbecue|bbq)/.test(value))}
function chainMatch(p){const hidden=$('hideChains').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const name=(p.name+' '+p.brand).toLowerCase();return !hidden.some(x=>name.includes(x))}
function directionsUrl(p,origin){return'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route='+origin.lat+','+origin.lon+';'+p.lat+','+p.lon}
function render(places,origin,destination){const radius=Number($('radius').value);const nearby=places.map(p=>({...p,distance:miles(origin,p)})).filter(p=>p.distance<=radius);let rows=nearby.filter(p=>cuisineMatch(p)&&chainMatch(p));let routeNote='';if(destination){const corridor=rows.filter(p=>routeDistance(p,origin,destination)<=0.45);rows=corridor;routeNote='Showing places within about 0.45 miles of the straight-line route corridor.'}
 const sort=$('sort').value;if(sort==='distance'||sort==='recommended')rows.sort((a,b)=>a.distance-b.distance);if(sort==='price')rows.sort((a,b)=>priceRank(a.price)-priceRank(b.price)||a.distance-b.distance);if(sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name));
 $('count').textContent=rows.length+' '+(rows.length===1?'place':'places');$('map').src='https://www.openstreetmap.org/export/embed.html?bbox='+(origin.lon-.06)+'%2C'+(origin.lat-.04)+'%2C'+(origin.lon+.06)+'%2C'+(origin.lat+.04)+'&layer=mapnik&marker='+origin.lat+'%2C'+origin.lon;$('map').style.display='block';$('mapFallback').style.display='none';
 if(!rows.length){
  if(nearby.length){
   $('results').innerHTML='<div class="empty">Your saved food or chain filters hid every nearby place. <button id="showAllNearby" type="button">Show all nearby places</button></div>';
   $('showAllNearby').addEventListener('click',()=>{$('cuisine').value='';$('hideChains').value='';save();render(places,origin,destination)});
  }else{
   $('results').innerHTML='<div class="empty">No mapped restaurants came back for this search. Try a wider distance, or search “Downtown Knoxville, TN” instead of using a location pin.</div>';
  }
  return
 }
 $('results').innerHTML=(routeNote?'<p class="note" style="grid-column:1/-1">'+safe(routeNote)+'</p>':'')+rows.slice(0,60).map(p=>{const walkMi=p.distance*1.3,walkMin=Math.max(1,Math.round(walkMi/3*60));const tag=[p.cuisine||p.amenity,p.brand].filter(Boolean).join(' · ');const price=p.price?'Listed price: '+safe(p.price):'Price not listed';const searchUrl='https://www.openstreetmap.org/?mlat='+p.lat+'&mlon='+p.lon+'#map=17/'+p.lat+'/'+p.lon;return'<article class="restaurant"><h3>'+safe(p.name)+'</h3><p class="tags">'+safe(tag||'Restaurant')+'</p><p class="distance">'+p.distance.toFixed(1)+' mi away · about '+walkMin+' min walking*</p><p>'+safe(price)+'</p><p>'+safe(p.address||'Address not listed')+'</p>'+(p.opening?'<p>Hours: '+safe(p.opening)+'</p>':'')+'<a target="_blank" rel="noopener" href="'+directionsUrl(p,origin)+'">Walking directions</a><a target="_blank" rel="noopener" href="'+searchUrl+'">Map &amp; place details</a>'+(p.website?'<a target="_blank" rel="noopener" href="'+safe(p.website)+'">Website</a>':'')+(p.phone?'<a href="tel:'+safe(p.phone)+'">Call</a>':'')+'</article>'}).join('')+'<p class="note" style="grid-column:1/-1">* Walking time uses a 1.3× straight-line estimate when routed walking distance is unavailable. Place details are community-maintained and may be incomplete.</p>'
}
async function search(coords){save();$('status').textContent='Looking up restaurants…';$('search').disabled=true;try{const origin=coords||await geocode($('origin').value.trim());let destination=null;if($('destination').value.trim())destination=await geocode($('destination').value.trim());if(!coords)$('origin').value=$('origin').value.trim();const places=await getPlaces(origin,destination);render(places,origin,destination);$('status').textContent='Search complete. '+(destination?'Route corridor is approximate. ':'')+'Restaurant data © OpenStreetMap contributors.'}catch(e){$('status').textContent=e.message||'Search failed. Please try again.'}finally{$('search').disabled=false}}
$('search').addEventListener('click',()=>search());$('origin').addEventListener('keydown',e=>{if(e.key==='Enter')search()});$('useLocation').addEventListener('click',()=>{if(!navigator.geolocation){$('status').textContent='Location is unavailable in this browser. Enter a place instead.';return}$('status').textContent='Finding your location…';navigator.geolocation.getCurrentPosition(p=>{const coords={lat:p.coords.latitude,lon:p.coords.longitude};$('origin').value='My location';search(coords)},()=>{$('status').textContent='Location permission was not available. Enter a place instead.'},{timeout:10000,maximumAge:120000})});$('share').addEventListener('click',async()=>{const data={title:document.title,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);$('status').textContent='App link copied.'}}catch{}});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
