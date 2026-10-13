// Shared visual transport contract; each Lab supplies its own engine adapters.
export function mountTransport({state,seek,onScrub=()=>{}}) {
  const bar=document.getElementById('playbackScrubber');
  const play=document.getElementById('playButton'),pause=document.getElementById('stopButton');
  const rewind=document.getElementById('rewindButton');
  let dragging=false;
  const move=()=>{if(!bar.disabled)seek(Number(bar.value));};
  bar.addEventListener('pointerdown',()=>{dragging=true;onScrub(true);});
  bar.addEventListener('input',move);
  for(const name of ['change','pointerup','pointercancel','blur'])bar.addEventListener(name,()=>{dragging=false;onScrub(false);});
  rewind.addEventListener('click',()=>{if(!rewind.disabled)seek(0);});
  function refresh(){
    const s=state(),duration=Math.max(0,s.duration||0);
    const progress=duration?Math.max(0,Math.min(1,s.seconds/duration)):0;
    if(!dragging)bar.value=String(progress);
    bar.disabled=!!s.disabled;rewind.disabled=!!s.disabled;pause.disabled=!!s.disabled;
    play.setAttribute('aria-pressed',String(s.playing));
    pause.setAttribute('aria-label','Pause');
    bar.style.setProperty('--progress',String(Number(bar.value)*100)+'%');
    bar.setAttribute('aria-valuetext',document.getElementById('timeStatus').textContent);
    requestAnimationFrame(refresh);
  }
  refresh();
}
