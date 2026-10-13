import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { adminRequest } from "@/api/accountApi";
type Inquiry = { id: string; name: string; email: string | null; phone: string | null; message: string; archived: boolean; created_at: string; delivery: string };
export default function InquiriesPage() {
  const { getAccessTokenSilently } = useAuth0();
  const [items, setItems] = useState<Inquiry[]>([]); const [page, setPage] = useState(0); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async (next: number) => { setBusy(true); try { const token=await getAccessTokenSilently(); const rows=await adminRequest<Inquiry[]>(token,`/inquiries?page=${next}`);setItems(rows);setPage(next);setNotice(""); } catch(e) {setNotice(e instanceof Error?e.message:"Could not load messages.");} finally {setBusy(false);} }, [getAccessTokenSilently]);
  useEffect(()=>{void load(0);},[load]);
  async function archive(id:string) {setBusy(true);try {const token=await getAccessTokenSilently();await adminRequest<void>(token,`/inquiries/${id}/archive`,`PATCH`);await load(page);}catch(e){setNotice(e instanceof Error?e.message:"Could not archive message.");setBusy(false);}}
  return <main className="studio-container studio-page"><p><Link className="studio-link" to="/admin">← Site editor</Link></p><h1 className="studio-page-heading">Messages</h1><p className="studio-lede">Private contact inquiries and notification delivery status.</p>{notice&&<p role="alert" className="my-4 rounded border p-4">{notice}</p>}{items.length===0&&!busy?<p className="my-8">No messages on this page.</p>:<ul className="mt-8 grid gap-4">{items.map(i=><li key={i.id} className="rounded border p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">{i.name}</h2><time dateTime={i.created_at}>{new Date(i.created_at).toLocaleString()}</time></div><p className="mt-2">{i.email||i.phone||"No reply address"} · notification {i.delivery}</p><p className="my-4 whitespace-pre-wrap">{i.message}</p>{!i.archived&&<button className="rounded border px-4 py-2" disabled={busy} onClick={()=>void archive(i.id)}>Archive message</button>}</li>)}</ul>}<div className="mt-6 flex gap-3"><button className="rounded border px-4 py-2" disabled={busy||page===0} onClick={()=>void load(page-1)}>Previous</button><button className="rounded border px-4 py-2" disabled={busy||items.length<25} onClick={()=>void load(page+1)}>Next</button></div></main>;
}
