import assert from 'node:assert/strict';
import * as T from 'three';
import {centralWorkstation} from '../../src/scripts/village/workshop';
// One central triangle and two outer stations; exported positions use normalized uint16 data.
const source=new T.BufferGeometry();
source.setAttribute('position',new T.Uint16BufferAttribute([32768,0,32768, 35000,65535,32768, 30000,0,40000, 0,0,0,1000,0,0,500,65535,0, 65535,0,0,64535,0,0,65000,65535,0],3,true));
const world=new T.Matrix4().makeScale(9,4,4);world.setPosition(-4.5,0,-2);
const geometry=centralWorkstation(source,world),p=geometry.getAttribute('position');
assert.equal(geometry.index!.count,3,'Only the central workstation remains');
assert.ok(Math.abs(p.getY(1)-4)<1e-6,'Quantized positions must decode before world scaling');
assert.ok(p.getX(0)>-.001&&p.getX(0)<.001,'World translation is preserved');
assert.ok(source.getAttribute('position').array instanceof Uint16Array,'Original shared asset stays unchanged');
const outer=centralWorkstation(source,world,false);assert.equal(outer.index!.count,6,'Only idle outer workstation tools remain');for(const index of outer.index!.array)assert.ok(Math.abs(outer.getAttribute('position').getX(index))>1.3);outer.dispose();geometry.dispose();source.dispose();console.log('Compressed workshop extraction passes');
