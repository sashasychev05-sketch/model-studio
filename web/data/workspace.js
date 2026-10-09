export async function workspaceAPI(value){
 const response=await fetch('/api/analysis',value?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}:{});
 const record=await response.json();
 if(!response.ok){const error=new Error(record.error||'Не удалось сохранить анализ');error.status=response.status;throw error;}
 return record;
}
