"""Bake the EA 2 m DTM into a small, smoothed scene height grid."""
from pathlib import Path
import json
import numpy as np
import rasterio
from pyproj import Transformer
root=Path(__file__).resolve().parents[2]
with rasterio.open(root/'artifacts/village/terrain/ea-dtm-2m.tif') as ds:
 a=ds.read(1,masked=True);assert a.count()==a.size
 # Gaussian smoothing, sigma 6 m, suppresses small modern earthworks.
 k=np.exp(-np.arange(-9,10)**2/18);k/=k.sum()
 a=np.apply_along_axis(lambda v:np.convolve(np.pad(v,9,mode='edge'),k,mode='valid'),0,a)
 a=np.apply_along_axis(lambda v:np.convolve(np.pad(v,9,mode='edge'),k,mode='valid'),1,a)
 xs=np.arange(-240,241,4);zs=np.arange(-328,209,4)
 xx,zz=np.meshgrid(xs,zs)
 lat=52.47575918-zz/111320;lon=-2.09357062+xx/(111320*np.cos(np.deg2rad(52.47575918)))
 e,n=Transformer.from_crs(4326,27700,always_xy=True).transform(lon,lat)
 col=(e-ds.transform.c)/2-.5;row=(ds.transform.f-n)/2-.5
 i=np.floor(col).astype(int);j=np.floor(row).astype(int);u=col-i;v=row-j
 h=a[j,i]*(1-u)*(1-v)+a[j,i+1]*u*(1-v)+a[j+1,i]*(1-u)*v+a[j+1,i+1]*u*v
 data={'source':'Environment Agency 2022 composite DTM 2m','datum':82,'smoothingSigmaMetres':6,'step':4,'x0':int(xs[0]),'z0':int(zs[0]),'width':len(xs),'height':len(zs),'heights':np.round(h-82,3).ravel().tolist()}
 (root/'src/data/terrain-heights.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
 print('terrain grid',h.shape,'range OD',h.min(),h.max())
