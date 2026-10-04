import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'

type Artwork = { id:number; title:string; artist_display:string; date_display:string; image_id:string|null; department_title:string; place_of_origin:string; medium_display:string; dimensions:string; credit_line:string; style_title:string|null; classification_title:string|null; thumbnail?:{alt_text?:string} }
type Props = { artworks:Artwork[]; loading:boolean; error:string }
const API='https://api.artic.edu/api/v1/artworks'
const FIELDS='id,title,artist_display,date_display,image_id,department_title,place_of_origin,medium_display,dimensions,credit_line,thumbnail,style_title,classification_title'
const imageUrl=(art:Artwork,width=843)=>art.image_id?`https://www.artic.edu/iiif/2/${art.image_id}/full/${width},/0/default.jpg`:''
const artistName=(artist:string)=>artist?.split('\n')[0]||'Artist unknown'

function Status({loading,error}:{loading:boolean;error:string}) { return <div className={`status ${error?'error':''}`}>{loading&&<span className="loader"/>}<strong>{error?'We hit a snag.':'Curating the collection…'}</strong>{error&&<span>{error}</span>}</div> }

function ListView({artworks,loading,error}:Props){
  const [query,setQuery]=useState(''); const [sort,setSort]=useState<'title'|'artist'|'date'>('title'); const [order,setOrder]=useState<'asc'|'desc'>('asc')
  const results=useMemo(()=>artworks.filter(a=>`${a.title} ${a.artist_display} ${a.date_display}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>{
    const pair={title:[a.title,b.title],artist:[artistName(a.artist_display),artistName(b.artist_display)],date:[a.date_display,b.date_display]}[sort]
    const compared=pair[0].localeCompare(pair[1],undefined,{numeric:true}); return order==='asc'?compared:-compared
  }),[artworks,query,sort,order])
  return <main className="page"><header className="page-heading"><div><p className="eyebrow">Explore the archive</p><h1>Collection index</h1></div><p>Search, sort, and step closer to works held by the Art Institute of Chicago.</p></header>
    <section className="controls" aria-label="Collection controls"><label><span>Search the collection</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try an artist, title, or year…"/></label><label><span>Sort by</span><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="title">Title</option><option value="artist">Artist</option><option value="date">Date</option></select></label><label><span>Order</span><select value={order} onChange={e=>setOrder(e.target.value as typeof order)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label></section>
    {loading||error?<Status loading={loading} error={error}/>:<section aria-live="polite"><div className="results-meta"><strong>{results.length}</strong> works found</div><div className="art-list">{results.map((art,i)=><Link className="list-row" to={`/artwork/${art.id}`} key={art.id}><span className="row-number">{String(i+1).padStart(2,'0')}</span><span className="miniature">{imageUrl(art)?<img src={imageUrl(art,200)} alt=""/>:<span>No image</span>}</span><span className="row-main"><strong>{art.title}</strong><small>{artistName(art.artist_display)}</small></span><span className="row-date">{art.date_display||'Date unknown'}</span><span className="row-arrow">↗</span></Link>)}</div>{!results.length&&<div className="empty">No works match “{query}”. Try a broader search.</div>}</section>}
  </main>
}

function GalleryView({artworks,loading,error}:Props){
  const [chosen,setChosen]=useState<string[]>([]); const departments=useMemo(()=>[...new Set(artworks.map(a=>a.department_title).filter(Boolean))].sort(),[artworks]); const results=chosen.length?artworks.filter(a=>chosen.includes(a.department_title)):artworks
  const toggle=(name:string)=>setChosen(old=>old.includes(name)?old.filter(x=>x!==name):[...old,name])
  return <main className="page"><header className="page-heading"><div><p className="eyebrow">A visual passage</p><h1>Gallery</h1></div><p>Filter the walls by department. Select as many as you like.</p></header>{loading||error?<Status loading={loading} error={error}/>:<><div className="filter-bar"><button className={!chosen.length?'active':''} onClick={()=>setChosen([])}>All works</button>{departments.map(name=><button className={chosen.includes(name)?'active':''} onClick={()=>toggle(name)} key={name}>{name}</button>)}</div><div className="gallery-grid">{results.filter(a=>a.image_id).map(art=><Link className="gallery-card" to={`/artwork/${art.id}`} key={art.id}><div className="gallery-image"><img src={imageUrl(art,600)} alt={art.thumbnail?.alt_text||art.title} loading="lazy"/></div><h2>{art.title}</h2><p>{artistName(art.artist_display)}</p></Link>)}</div></>}</main>
}

function DetailView({artworks}:{artworks:Artwork[]}){
  const {id}=useParams(); const navigate=useNavigate(); const [artwork,setArtwork]=useState<Artwork|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const index=artworks.findIndex(a=>a.id===Number(id))
  useEffect(()=>{const cached=artworks.find(a=>a.id===Number(id)); if(cached){setArtwork(cached);setLoading(false);setError('');return} setLoading(true);axios.get(`${API}/${id}`,{params:{fields:FIELDS}}).then(({data})=>{setArtwork(data.data);setError('')}).catch(()=>setError('That artwork could not be loaded.')).finally(()=>setLoading(false))},[artworks,id])
  const move=(offset:number)=>{if(!artworks.length)return;const next=index<0?0:(index+offset+artworks.length)%artworks.length;navigate(`/artwork/${artworks[next].id}`)}
  if(loading||error||!artwork)return <main className="page"><Status loading={loading} error={error||(!loading?'Artwork not found.':'')}/></main>
  const details=[['Date',artwork.date_display],['Origin',artwork.place_of_origin],['Medium',artwork.medium_display],['Dimensions',artwork.dimensions],['Department',artwork.department_title],['Classification',artwork.classification_title]].filter(([,v])=>v)
  return <main className="detail-page"><div className="detail-image-panel">{imageUrl(artwork)?<img src={imageUrl(artwork,1200)} alt={artwork.thumbnail?.alt_text||artwork.title}/>:<div>Image unavailable</div>}</div><article className="detail-copy"><Link className="back-link" to="/gallery">← Back to gallery</Link><p className="eyebrow">Object {artwork.id}</p><h1>{artwork.title}</h1><p className="artist">{artistName(artwork.artist_display)}</p><dl>{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="credit">{artwork.credit_line}</p><div className="detail-nav"><button onClick={()=>move(-1)} disabled={!artworks.length}>← Previous</button><span>{index>=0?`${index+1} / ${artworks.length}`:'In the collection'}</span><button onClick={()=>move(1)} disabled={!artworks.length}>Next →</button></div></article></main>
}

function App(){
  const [artworks,setArtworks]=useState<Artwork[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('')
  useEffect(()=>{axios.get(`${API}/search`,{params:{q:'painting',limit:60,fields:FIELDS}}).then(({data})=>{setArtworks(data.data);setError('')}).catch(()=>setError('The museum API is unavailable right now. Please try again shortly.')).finally(()=>setLoading(false))},[])
  return <BrowserRouter basename={import.meta.env.BASE_URL}><div className="app-shell"><nav className="site-nav"><Link className="brand" to="/"><span className="brand-mark">A</span><span>Afterimage<br/><small>Open collection</small></span></Link><div><NavLink to="/collection">Index</NavLink><NavLink to="/gallery">Gallery</NavLink></div></nav><Routes><Route path="/" element={<Navigate to="/gallery" replace/>}/><Route path="/collection" element={<ListView artworks={artworks} loading={loading} error={error}/>}/><Route path="/gallery" element={<GalleryView artworks={artworks} loading={loading} error={error}/>}/><Route path="/artwork/:id" element={<DetailView artworks={artworks}/>}/><Route path="*" element={<Navigate to="/gallery" replace/>}/></Routes><footer><span>Afterimage · Student collection study</span><a href="https://www.artic.edu/open-access/open-access-images" target="_blank" rel="noreferrer">Data &amp; images: Art Institute of Chicago ↗</a></footer></div></BrowserRouter>
}
export default App
