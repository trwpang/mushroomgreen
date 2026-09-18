"""Draw a source-backed terrain study; does not modify the Three.js landscape.
Run with numpy, matplotlib, rasterio and pyproj installed.
"""
from pathlib import Path
import json
import numpy as np
import rasterio
from pyproj import Transformer
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LightSource, LinearSegmentedColormap
from matplotlib.lines import Line2D

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/village/terrain'
t=Transformer.from_crs(4326,27700,always_xy=True)
origin=t.transform(-2.09357062,52.47575918)
def grid(points):
    p=np.array([t.transform(lon,lat) for lat,lon in points]);return p
with rasterio.open(OUT/'ea-dtm-2m.tif') as ds:
    terrain=ds.read(1,masked=True)
    assert terrain.count()==terrain.size, 'Missing height samples'
    e=ds.transform.c+(np.arange(ds.width)+.5)*ds.transform.a
    n=ds.transform.f+(np.arange(ds.height)+.5)*ds.transform.e
    X,Y=np.meshgrid(e-origin[0],n-origin[1])
    def sample(points):return np.array([v[0] for v in ds.sample(points)])
    homes=json.loads((ROOT/'dist/households.json').read_text())
    hp=grid([(h['position']['lat'],h['position']['lon']) for h in homes]);hh=sample(hp)
    brook=grid(json.loads((ROOT/'src/data/brook.json').read_text()))
    mouse=grid(json.loads((ROOT/'src/data/mousesweet.json').read_text())['polyline'])
    roads=[grid(r['polyline']) for r in json.loads((ROOT/'src/data/roads.json').read_text())]
    forge=grid([[52.4754217,-2.0931022]])[0]
    ellipse=(X/210)**2+((Y-60)/240)**2<.96
    study=terrain[ellipse]
    pwest=np.array([origin[0]-80,origin[1]])
    points={'Henry’s mapped home':list(origin),'Chainshop':forge.tolist(),'80 m west of Henry':pwest.tolist()}
    values={k:round(float(sample([v])[0]),1) for k,v in points.items()}
    # Sample the brook nearest the actual forge, using mapped vertices.
    nearest=brook[np.argmin(np.linalg.norm(brook-forge,axis=1))]
    points['Black Brook nearest forge']=nearest.tolist(); values['Black Brook nearest forge']=round(float(sample([nearest])[0]),1)
    hmin,hmax=int(np.argmin(hh)),int(np.argmax(hh))
    stats={'source':'Environment Agency LIDAR Composite DTM 2m (2022 composite)',
      'source_page':'https://environment.data.gov.uk/dataset/09ea3b37-df3a-4e8b-ac69-fb0842227b04',
      'download_date':'2026-09-18','crs':'EPSG:27700','units':'metres above Ordnance Datum Newlyn',
      'bbox':[393300,286000,394200,287000],'grid_spacing_m':2,
      'village_display_ellipse_range_m':[round(float(study.min()),1),round(float(study.max()),1)],
      'mapped_household_location_range_m':[round(float(hh.min()),1),round(float(hh.max()),1)],
      'lowest_household':homes[hmin]['number'],'highest_household':homes[hmax]['number'],
      'landmark_heights_m':values,
      'note':'Modern bare-earth heights at historical map coordinates. Not an 1865 survey. Water surfaces and changed ground require historical checks.'}
    (OUT/'elevation-findings.json').write_text(json.dumps(stats,indent=2)+'\n')
    print(json.dumps(stats,indent=2))
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'text.color':'#27362d','axes.labelcolor':'#27362d'})
    fig=plt.figure(figsize=(13,10),facecolor='#f3f0e7')
    ax=fig.add_axes([.07,.17,.65,.70]);ax.set_facecolor('#f3f0e7')
    cmap=LinearSegmentedColormap.from_list('land',['#537d77','#9ea979','#d4ca94','#ae8464'])
    rgb=LightSource(azdeg=310,altdeg=50).shade(np.asarray(terrain),cmap=cmap,vert_exag=1.4,dx=2,dy=2,vmin=88,vmax=112,blend_mode='soft')
    ax.imshow(rgb,extent=[e[0]-origin[0]-1,e[-1]-origin[0]+1,n[-1]-origin[1]-1,n[0]-origin[1]+1],origin='upper')
    c=ax.contour(X,Y,terrain,levels=np.arange(80,126,2),colors='#3e5148',linewidths=.55,alpha=.65)
    ax.clabel(c,levels=np.arange(80,126,4),inline=True,fontsize=8,fmt='%d m')
    for p in roads:ax.plot(p[:,0]-origin[0],p[:,1]-origin[1],color='#fff4d9',lw=3,zorder=3)
    for p in [brook,mouse]:ax.plot(p[:,0]-origin[0],p[:,1]-origin[1],color='#164e75',lw=1.8,zorder=4)
    ax.scatter(hp[:,0]-origin[0],hp[:,1]-origin[1],s=13,c='#6c402c',edgecolors='#fff4d9',linewidths=.5,zorder=5)
    theta=np.linspace(0,2*np.pi,250);ax.plot(210*np.sqrt(.96)*np.cos(theta),60+240*np.sqrt(.96)*np.sin(theta),color='#3b453c',ls='--',lw=1,alpha=.7)
    labels=[('Henry’s home · '+str(values['Henry’s mapped home'])+' m',np.array(origin),(65,35)),('Chainshop · '+str(values['Chainshop'])+' m',forge,(70,-8)),('Brook · '+str(values['Black Brook nearest forge'])+' m',nearest,(-135,-30))]
    for label,p,offset in labels:
      x,y=p-np.array(origin);ax.scatter(x,y,s=40,c='#a0492e',edgecolors='white',zorder=6)
      ax.annotate(label,(x,y),xytext=offset,textcoords='offset points',fontsize=10,bbox=dict(boxstyle='round,pad=.4',fc='#faf8ef',ec='none',alpha=.94),arrowprops=dict(arrowstyle='-',color='#423d32'),zorder=7)
    ax.set_xlim(-240,250);ax.set_ylim(-200,320);ax.set_aspect('equal');ax.set_xlabel('Metres east / west of Henry’s mapped home');ax.set_ylabel('Metres north / south of Henry’s mapped home')
    ax.annotate('N',xy=(222,290),xytext=(222,240),ha='center',fontsize=13,weight='bold',arrowprops=dict(arrowstyle='-|>',color='#27362d'))
    ax.plot([-215,-115],[-177,-177],color='#27362d',lw=3);ax.text(-165,-165,'100 metres',ha='center',fontsize=9)
    ax.legend(handles=[Line2D([0],[0],color='#fff4d9',lw=3,label='Historical mapped roads'),Line2D([0],[0],color='#164e75',lw=2,label='Historical mapped brooks'),Line2D([0],[0],marker='o',color='none',markerfacecolor='#6c402c',label='Household locations'),Line2D([0],[0],color='#3b453c',ls='--',label='Current scene extent')],loc='upper left',fontsize=8,framealpha=.92)
    fig.text(.075,.955,'MUSHROOM GREEN',fontsize=11,weight='bold',color='#64735c')
    fig.text(.075,.915,'The ground beneath the village',fontsize=25,weight='bold')
    fig.text(.75,.81,'REAL RELIEF',fontsize=12,weight='bold')
    fig.text(.75,.76,f'{stats["village_display_ellipse_range_m"][0]}–{stats["village_display_ellipse_range_m"][1]} m',fontsize=23)
    fig.text(.75,.71,'Height range within our scene.\nModern terrain, including slopes\nand stream valleys.',fontsize=10,va='top',linespacing=1.6)
    fig.text(.75,.60,f'{stats["mapped_household_location_range_m"][0]}–{stats["mapped_household_location_range_m"][1]} m',fontsize=23)
    fig.text(.75,.55,'At the 59 mapped households.\nThe settlement is on higher ground\nbeside the brook.',fontsize=10,va='top',linespacing=1.6)
    fig.text(.75,.43,'READING THE MAP',fontsize=11,weight='bold')
    fig.text(.75,.385,'Contours every 2 metres.\nClose lines mean steep ground.\nBlue lines show our mapped brooks.\nNorth is up.',fontsize=10,va='top',linespacing=1.8)
    fig.text(.75,.235,'Historical caution',fontsize=11,weight='bold')
    fig.text(.75,.185,'This is modern terrain.\nMining, roads and former pools\nmay have changed the 1865 ground.',fontsize=9,va='top',linespacing=1.7)
    fig.text(.075,.105,'Source: Environment Agency LIDAR Composite DTM, 2 m grid · 2022 composite · heights above Ordnance Datum Newlyn',fontsize=9)
    fig.text(.075,.08,'© Environment Agency copyright and/or database right 2022. All rights reserved. Historical layout: project source map.',fontsize=8,color='#666c5e')
    fig.savefig(OUT/'mushroom-green-contours.png',dpi=170,facecolor=fig.get_facecolor())
    fig.savefig(OUT/'mushroom-green-contours.svg',facecolor=fig.get_facecolor())
