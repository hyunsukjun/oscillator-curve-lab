import {FFT} from './fft.js?v=20260928-fft1';
export const ANALYSIS_SIZE=2048;
// Streaming overview: fixed-size rings, calibrated one-sided Hann amplitudes,
// mean channel power (not mono summing), identical frequency/colour ranges.
export class SpectrogramAnalysis {
  constructor(channelCount,length,rate,width=512,height=192){
    this.length=length;this.rate=rate;this.width=Math.max(2,Math.min(512,width));this.height=height;
    this.minHz=20;this.maxHz=Math.min(20000,rate/2);this.size=ANALYSIS_SIZE;
    this.rings=Array.from({length:channelCount},()=>new Float64Array(this.size));
    this.re=new Float64Array(this.size);this.im=new Float64Array(this.size);this.power=new Float64Array(this.size/2+1);
    this.window=Float64Array.from({length:this.size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/this.size));
    this.fft=new FFT(this.size);this.data=new Float32Array(this.width*height).fill(-90);this.count=0;this.column=0;
  }
  nextEnd(){return Math.round(this.column*(this.length-1)/(this.width-1))+this.size/2;}
  push(channels,count=channels[0].length){
    for(let i=0;i<count;i++){
      for(let c=0;c<this.rings.length;c++)this.rings[c][this.count%this.size]=channels[c][i];
      this.count++;
      while(this.column<this.width && this.count>=this.nextEnd())this.capture();
    }
  }
  finish(){const zero=this.rings.map(()=>new Float32Array(this.size/2));this.push(zero);return {data:this.data,width:this.width,height:this.height,minHz:this.minHz,maxHz:this.maxHz,duration:this.length/this.rate,rate:this.rate,fftSize:this.size};}
  capture(){
    this.power.fill(0);
    for(const ring of this.rings){
      for(let i=0;i<this.size;i++){this.re[i]=ring[(this.count+i)%this.size]*this.window[i];this.im[i]=0;}
      this.fft.transform(this.re,this.im);
      for(let k=1;k<this.power.length;k++)this.power[k]+=(this.re[k]**2+this.im[k]**2)*(4/this.size)**2/this.rings.length;
    }
    for(let row=0;row<this.height;row++){
      const low=this.minHz*(this.maxHz/this.minHz)**(1-(row+1)/this.height),high=this.minHz*(this.maxHz/this.minHz)**(1-row/this.height);
      const a=Math.max(1,Math.min(this.size/2,Math.round(low*this.size/this.rate))),b=Math.max(a,Math.min(this.size/2,Math.round(high*this.size/this.rate)));
      let power=0;for(let k=a;k<=b;k++)power=Math.max(power,this.power[k]);
      this.data[row*this.width+this.column]=Math.max(-90,Math.min(0,10*Math.log10(Math.max(1e-12,power))));
    }
    this.column++;
  }
}
