/* Product data is local to this browser. A successful put, not a toast alone,
   is the persistence boundary. No network or analytics SDK. */
const QuoteStore=(()=>{
  let db;
  async function open(){
    if(db)return db;
    db=await new Promise((resolve,reject)=>{const r=indexedDB.open('quotelens-workspaces',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspaces',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Browser storage is unavailable. Export a backup before closing this tab.'));r.onblocked=()=>reject(Error('Another tab is updating storage. Close that tab and reload.'));});
    db.onversionchange=()=>{db.close();db=null;};return db;
  }
  async function transact(mode,operation){const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction('workspaces',mode),store=t.objectStore('workspaces');let value;const r=operation(store);r.onsuccess=()=>{value=r.result};t.oncomplete=()=>resolve(value);t.onerror=()=>reject(Error('Could not save to browser storage. Keep this tab open and export a backup.'));t.onabort=()=>reject(Error('Storage write was interrupted. Export a backup before closing.'));});}
  return {all:()=>transact('readonly',s=>s.getAll()),put:w=>transact('readwrite',s=>s.put(w)),remove:id=>transact('readwrite',s=>s.delete(id))};
})();
