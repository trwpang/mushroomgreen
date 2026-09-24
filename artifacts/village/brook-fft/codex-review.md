**1. Per pair**

- **Image 1 — Better.** The channel looks less straight. Ripples respond more clearly to rocks. However, the broad white reflection makes the brook look metallic.
- **Image 2 — Better.** Rocks have clearer contact with the bank. The shoreline has more shape. The exposed bank now resembles a cut trench.
- **Image 3 — Worse.** The large rock appears suspended above a dark gap. Reeds still emerge through its top. Added exposure makes these placement faults clearer.
- **Image 4 — Worse.** The central rock overhangs a black bank face. Dense white ripples dominate the foreground. The old surface looks calmer and more plausible here.
- **Image 5 — Motion evidence only.** Surface patterns change and visibly bend around the rock. That is useful progress. Four stills cannot establish smooth motion, correct speed, or freedom from advection resets.

**2. Six remaining defects, ranked**

Costs below describe added GPU work, not measured frame times.

1. **Broken bank and rock contact.**  
   **Where:** Images 3–4, beneath the large foreground rocks; Image 2, exposed left bank.  
   **Why:** Black wedges and steep, smooth faces make the brook look excavated. Rocks appear placed above the ground.  
   **Fix:** Embed rocks into terrain. Shape submerged sediment around their bases. Use the same terrain height field for bank geometry and water coverage. Add a narrow, irregular wet band using height above water.  
   **Cost:** Mostly geometry work; roughly 1–2 extra material samples. No extra scene pass.

2. **Too much bright, tightly folded reflection.**  
   **Where:** Image 1, upper channel; Image 4, lower right; all Image 5 frames.  
   **Why:** The surface resembles crumpled foil. Bright sky reflections are valid, but their dense coverage overwhelms this shallow brook.  
   **Fix:** Reduce short-wave slope strength. Filter unresolved normal bands with `dFdx/dFdy`. Use Fresnel to divide reflection and transmission: `F*reflection + (1-F)*transmission`. Check exposure before reducing reflection intensity.  
   **Cost:** Small shader change; no extra pass.

3. **Weak underwater structure.**  
   **Where:** Image 2, foreground; Image 1, right-hand shallows.  
   **Why:** Smooth green-brown areas give little evidence of depth, sediment, or submerged stones. Depth tint alone looks like coloured glass.  
   **Fix:** Add varied bed gravel and submerged rock geometry. Reconstruct water thickness from scene depth. Apply Beer–Lambert absorption along the refracted path. Reject refraction samples that hit foreground objects.  
   **Cost:** About 3–6 texture reads; an opaque colour/depth target if unavailable. WebGL2 supports this through [Three.js render targets](https://threejs.org/manual/pages/rendertargets.html).

4. **White contact bands read as outlines.**  
   **Where:** Image 2, around bank rocks; Image 3, distant midstream stone.  
   **Why:** Persistent pale collars suggest foam everywhere. Slow water should not outline every obstruction. Some whiteness may be reflection; isolate both contributions.  
   **Fix:** Gate foam by local speed and compression, then advect and decay it. Break coverage into sparse patches. Remove foam from quiet contacts.  
   **Cost:** Cheap mask changes; persistent foam adds one small ping-pong update.

5. **Flow changes direction more convincingly than character.**  
   **Where:** Image 5, beside and behind the central rock.  
   **Why:** Bent ripples help, but similarly busy water remains across much of the channel. Sheltered water needs a visibly different response.  
   **Fix:** Drive wave amplitude and anisotropy from local speed, depth, and velocity gradients. Suppress short waves in sheltered zones. Use sparse downstream disturbance.  
   **Cost:** One packed flow-field sample plus shader arithmetic.

6. **Surrounding assets defeat water realism.**  
   **Where:** Images 3–4, reeds through stones; Image 5, angular rocks and repetitive foliage.  
   **Why:** These faults set the scene’s realism limit.  
   **Fix:** Exclude plants from rock footprints. Improve rock silhouettes, wetness variation, and leaf shading.  
   **Cost:** Placement fixes cost nothing per frame; asset improvements add geometry and material reads.

**3. Regressions**

Tone down short-wave contrast and continuous white contact bands. Repair the newly exposed bank faces and rock gaps.

**4. Verdict**

Still far from AAA: better flow cues, but shoreline geometry, water optics, and assets need substantial work.
