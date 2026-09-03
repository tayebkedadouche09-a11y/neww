import { useEffect, useRef, useState } from 'react';
import type { Place } from './engine';
import { findGooglePhoto, googlePhotosEnabled } from './googlePlaces';

type Props={place:Place;compact?:boolean};
type Photo={url:string;author?:string;authorUrl?:string;mapsUrl?:string};
export default function PlacePhoto({place,compact=false}:Props){
 const ref=useRef<HTMLDivElement|null>(null);const[active,setActive]=useState(false);const[photo,setPhoto]=useState<Photo|null>(null);const[failed,setFailed]=useState(false);const[fallbackFailed,setFallbackFailed]=useState(false);
 useEffect(()=>{const node=ref.current;if(!node||active)return;const observer=new IntersectionObserver((entries)=>{if(entries.some((entry)=>entry.isIntersecting)){setActive(true);observer.disconnect();}},{rootMargin:'500px 0px'});observer.observe(node);return()=>observer.disconnect();},[active]);
 useEffect(()=>{if(!active||!googlePhotosEnabled())return;let cancelled=false;void findGooglePhoto(place).then((result)=>{if(cancelled)return;if(result)setPhoto(result);else setFailed(true);});return()=>{cancelled=true;};},[active,place]);
 const fallback=place.photoFallback;return <div ref={ref} className={compact?'place-photo compact':'place-photo'}>{photo&&!failed?<><img src={photo.url} alt={place.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/><div className="photo-credit"><span>Google Maps</span>{photo.author?(photo.authorUrl?<a href={photo.authorUrl} target="_blank" rel="noreferrer">{photo.author}</a>:<span>{photo.author}</span>):null}{photo.mapsUrl?<a href={photo.mapsUrl} target="_blank" rel="noreferrer" aria-label={`Voir ${place.name} sur Google Maps`}>↗</a>:null}</div></>:fallback&&!fallbackFailed?<><img src={fallback} alt={place.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFallbackFailed(true)}/><div className="photo-credit"><span>OpenStreetMap</span></div></>:<div className="photo-empty"><span>{failed?'Photo indisponible':googlePhotosEnabled()?'Photo Google Maps…':'Photos Google à configurer'}</span></div>}</div>;
}
