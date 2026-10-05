import { useEffect, useState } from 'react';
import type { GoogleTasksStatus } from '../types/googleTasks';
// Status broadcasts include the cached list catalog, shared by all widget rows.
export function useGoogleTasksLists() {
  const [status, setStatus] = useState<GoogleTasksStatus>({ configured:false, connected:false, syncing:false, autoSync:true });
  useEffect(() => {
    const api = window.electronAPI?.googleTasks;if (!api) return;
    let alive=true;
    const update=(value:GoogleTasksStatus)=>{if(alive)setStatus(value);};
    const off=api.subscribe(update);
    void api.status().then(async value=>{update(value);if(value.connected)await api.lists();}).catch(()=>{});
    return()=>{alive=false;off();};
  },[]);
  return status;
}
