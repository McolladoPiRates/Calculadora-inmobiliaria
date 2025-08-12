export function Switch({ checked=false, onCheckedChange=()=>{}, id }) {
  return (
    <label htmlFor={id} style={{display:"inline-flex",alignItems:"center",cursor:"pointer",gap:8}}>
      <input id={id} type="checkbox" checked={checked} onChange={e=>onCheckedChange(e.target.checked)} style={{display:"none"}} />
      <span style={{width:36,height:20,background:checked?"#10B981":"#d1d5db",borderRadius:999,position:"relative",transition:"all .2s"}}>
        <span style={{width:16,height:16,background:"#fff",borderRadius:999,position:"absolute",top:2,left:checked?18:2,transition:"all .2s"}} />
      </span>
    </label>
  );
}
