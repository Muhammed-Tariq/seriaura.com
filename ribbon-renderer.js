/* A fixed, warped mesh with scrolling lettering sampled on the GPU. No glyph
   nodes, per-frame geometry uploads, font layout, or full-page drawing surface. */
class RibbonGraphics {
  constructor(svg, onReset) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ribbon-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.gl = this.canvas.getContext('webgl', {alpha:true, antialias:false, depth:false, stencil:false});
    if (!this.gl) throw new Error('WebGL unavailable');
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec4 a_text;
      uniform vec4 u_view;
      uniform float u_auraPass;
      varying highp vec4 v_text;
      varying highp vec2 v_position;
      void main() {
        vec2 position = u_auraPass > .5 ? a_position * u_view.xy + u_view.zw : a_position;
        gl_Position = vec4((position.x - u_view.z) / u_view.x * 2.0 - 1.0,
          1.0 - (position.y - u_view.w) / u_view.y * 2.0, 0.0, 1.0);
        v_text = a_text;
        v_position = position;
      }`);
    const fragment = compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      uniform sampler2D u_atlas;
      uniform sampler2D u_letters;
      uniform vec2 u_lookupSize;
      uniform vec4 u_atlasSize;
      uniform vec2 u_inkSize;
      uniform float u_length;
      uniform float u_time;
      uniform vec4 u_glowCenters;
      uniform vec4 u_glowStyle;
      uniform vec4 u_auraCurve;
      uniform float u_auraWidth;
      uniform float u_auraPass;
      varying highp vec4 v_text;
      varying highp vec2 v_position;
      vec4 glowRamp(float distance, float strength) {
        float t = clamp(distance, 0.0, 1.0);
        vec3 color;
        float opacity;
        if (t < .22) {color = mix(vec3(255.,208.,137.),vec3(255.,150.,31.),t/.22);opacity=1.;}
        else if (t < .48) {float f=(t-.22)/.26;color=mix(vec3(255.,150.,31.),vec3(255.,101.,16.),f);opacity=mix(1.,.659,f);}
        else if (t < .72) {float f=(t-.48)/.24;color=mix(vec3(255.,101.,16.),vec3(242.,71.,0.),f);opacity=mix(.659,.2,f);}
        else {color=vec3(242.,71.,0.);opacity=.2*(1.-t)/.28;}
        return vec4(color/255.,opacity*strength);
      }
      vec4 glowAt(vec2 center, float strength) {
        return glowRamp(distance(v_position, center) / max(1.0, u_glowStyle.x),strength);
      }
      void main() {
        if (u_auraPass > .5) {
          // Measure across the actual parabola, so every part of the halo bends
          // with the lettering rather than rotating one straight ellipse.
          float along=(v_position.x-u_auraCurve.x)/u_auraCurve.y;
          float curveY=u_auraCurve.w+u_auraCurve.z*along*along;
          float slope=2.*u_auraCurve.z*along/u_auraCurve.y;
          float across=(v_position.y-curveY)/sqrt(1.+slope*slope)/u_auraWidth;
          float first=(v_position.x-u_glowCenters.x)/u_glowStyle.x;
          float second=(v_position.x-u_glowCenters.z)/u_glowStyle.x;
          vec4 a=glowRamp(length(vec2(first,across)),u_glowStyle.y*.15);
          vec4 b=glowRamp(length(vec2(second,across)),u_glowStyle.z*.15);
          gl_FragColor=vec4(a.rgb*a.a,a.a)+vec4(b.rgb*b.a,b.a)*(1.-a.a);
          return;
        }
        float character = v_text.x - u_time * v_text.w;
        float index = v_text.z * u_length + mod(floor(character) - 1.0, u_length);
        vec2 lookup = vec2(mod(index, u_lookupSize.x), floor(index / u_lookupSize.x));
        vec4 encoded = texture2D(u_letters, (lookup + 0.5) / u_lookupSize);
        float glyph = floor(encoded.r * 255.0 + 0.5) + floor(encoded.g * 255.0 + 0.5) * 256.0;
        vec2 cell = vec2(mod(glyph, 16.0), floor(glyph / 16.0));
        vec2 pixel = cell * u_atlasSize.zw + 2.0 + vec2(fract(character), v_text.y) * u_inkSize;
        float alpha = texture2D(u_atlas, pixel / u_atlasSize.xy).a;
        vec4 ink = vec4(vec3(241.0,240.0,237.0)/255.0*u_glowStyle.w,u_glowStyle.w);
        if (u_glowStyle.y + u_glowStyle.z > 0.) {
          vec4 a=glowAt(u_glowCenters.xy,u_glowStyle.y),b=glowAt(u_glowCenters.zw,u_glowStyle.z);
          vec4 glow=a.a>=b.a?a:b;
          ink=mix(ink,vec4(glow.rgb,1.),glow.a);
        }
        gl_FragColor = ink * alpha;
      }`);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertex); gl.attachShader(this.program, fragment);
    gl.linkProgram(this.program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
    this.uniforms = Object.fromEntries(['view','atlas','letters','lookupSize','atlasSize','inkSize','length','time','glowCenters','glowStyle','auraCurve','auraWidth','auraPass']
      .map(name => [name, gl.getUniformLocation(this.program, `u_${name}`)]));
    this.buffer = gl.createBuffer();
    this.attributes={position:gl.getAttribLocation(this.program,'a_position'),text:gl.getAttribLocation(this.program,'a_text')};
    this.textures = [];
    this.pixelRatio = Math.min(devicePixelRatio || 1, 2);
    this.frameTimes = [];
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    svg.after(this.canvas);
    // Context loss must leave a quiet, static fallback, not a busy failed loop.
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.lost = true; this.canvas.hidden = true;
      this.cache?.remove();
      if (onReset) onReset(false);
      else { ribbonRenderKey = ''; scheduleLayout(); }
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.canvas.remove();
      if (onReset) onReset(true);
      else { ribbonGraphics = null; ribbonRenderKey = ''; scheduleLayout(); }
    });
  }

  build({width, documentTop, fontSize, advance, total, rows, frameAt, position, isPhone}) {
    const gl = this.gl;
    this.width = width; this.documentTop = documentTop;
    this.minY = Infinity; this.maxY = -Infinity;
    this.bands = new Map();
    this.canvas.hidden = false;
    gl.useProgram(this.program);
    this.textures.forEach(texture => gl.deleteTexture(texture));
    this.textures = [];
    const texture = (unit, filter, source, w, h) => {
      const value = gl.createTexture(); this.textures.push(value);
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, value);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    };
    const characters = [...new Set(rows.flatMap(row => row.letters))];
    const ids = new Map(characters.map((character, i) => [character, i]));
    // Oversampled glyph atlas keeps small, skewed type crisp on Retina screens.
    const inkWidth = advance / fontSize * 64, inkHeight = 96;
    const cellWidth = Math.ceil(inkWidth) + 4, cellHeight = inkHeight + 4;
    const atlas = document.createElement('canvas');
    atlas.width = cellWidth * 16; atlas.height = cellHeight * Math.ceil(characters.length / 16);
    const ctx = atlas.getContext('2d');
    ctx.font = '800 64px "Source Code Pro"'; ctx.fillStyle = '#fff';
    characters.forEach((character, i) => ctx.fillText(character,
      (i % 16) * cellWidth + 2, Math.floor(i / 16) * cellHeight + 2 + 64 * 1.15));
    texture(0, gl.LINEAR, atlas);
    const length = rows[0].letters.length, lookupWidth = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const lookupHeight = Math.ceil(length * rows.length / lookupWidth);
    const lookup = new Uint8Array(lookupWidth * lookupHeight * 4);
    rows.forEach((row, r) => row.letters.forEach((character, i) => {
      const id = ids.get(character), pixel = (r * length + i) * 4;
      lookup[pixel] = id % 256; lookup[pixel + 1] = Math.floor(id / 256); lookup[pixel + 3] = 255;
    }));
    texture(1, gl.NEAREST, lookup, lookupWidth, lookupHeight);
    gl.uniform1i(this.uniforms.atlas, 0); gl.uniform1i(this.uniforms.letters, 1);
    gl.uniform2f(this.uniforms.lookupSize, lookupWidth, lookupHeight);
    gl.uniform4f(this.uniforms.atlasSize, atlas.width, atlas.height, cellWidth, cellHeight);
    gl.uniform2f(this.uniforms.inkSize, inkWidth, inkHeight);
    gl.uniform1f(this.uniforms.length, length);
    const vertices = [];
    this.meshRows = [];
    const step = Math.min(advance, isPhone ? 3 : 4 * width / 1920);
    rows.forEach((row, r) => {
      const chunks = [];
      let chunk;
      const edge = distance => {
        const frame = frameAt(distance), point = position(frame, row.offset);
        return [0, 1].map(v => {
          const height = (v * 1.5 - 1.15) * fontSize * frame.glyphScale;
          const x = point.x + frame.nx * height, y = point.y + frame.ny * height;
          this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y);
          const band = Math.floor(y / 64);
          const bounds = this.bands.get(band) || [Infinity, -Infinity];
          bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.max(bounds[1], x);
          this.bands.set(band, bounds);
          return [x, y, distance / advance, v, r, row.direction * row.speed * (isPhone ? 1 : width / 1920) / advance];
        });
      };
      let previous = edge(advance);
      for (let distance = advance + step; distance < total - advance; distance += step) {
        const next = edge(distance);
        if (!chunk || chunk.count >= 192) {
          chunk = {first:vertices.length / 6, count:0, minY:Infinity, maxY:-Infinity};
          chunks.push(chunk);
        }
        for (const vertex of [...previous, ...next]) {
          chunk.minY = Math.min(chunk.minY, vertex[1]); chunk.maxY = Math.max(chunk.maxY, vertex[1]);
        }
        chunk.count += 6;
        vertices.push(...previous[0], ...previous[1], ...next[0], ...next[0], ...previous[1], ...next[1]);
        previous = next;
      }
      this.meshRows.push(chunks);
    });
    this.vertexCount = vertices.length / 6;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const attribute = (name, size, offset) => {
      const location = gl.getAttribLocation(this.program, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 24, offset);
    };
    attribute('a_position', 2, 0); attribute('a_text', 4, 8);
    this.lastTop = null;
    this.buildCache();
  }

  buildCache() {
    // Prepare the entire river once as narrow, independent tiles. Compositor
    // scrolling can reveal any part immediately, even before JS gets a frame.
    this.cache?.remove();
    const cache = document.createElement('div');
    cache.className = 'ribbon-cache';
    cache.setAttribute('aria-hidden','true');
    this.canvas.before(cache);
    this.cache = cache;
    const end = Math.ceil(this.maxY)+8;
    for (let top = Math.max(0,Math.floor(this.minY)-8); top < end; top += 768) {
      const bottom = Math.min(top+768,end);
      this.paint(0,0,0,{top,bottom});
      const tile = document.createElement('canvas');
      tile.className = 'ribbon-tile';
      tile.width = this.canvas.width; tile.height = this.canvas.height;
      tile.style.cssText = `left:${this.canvas.style.left};top:${this.canvas.style.top};width:${this.canvas.style.width};height:${this.canvas.style.height}`;
      tile.getContext('2d').drawImage(this.canvas,0,0);
      cache.append(tile);
    }
    this.lastTop = this.lastLeft = null;
  }

  sampleFrame(elapsed) {
    // Sustained slow frames on a software/low-power GPU reduce only the drawing
    // resolution, never the curve, speed, spacing, or page's text resolution.
    if (elapsed <= 0 || this.canvas.hidden || this.pixelRatio <= 1) return;
    this.frameTimes.push(elapsed);
    if (this.frameTimes.length < 45) return;
    this.frameTimes.sort((a,b) => a-b);
    if (this.frameTimes[33] > 22) this.pixelRatio = Math.max(1, this.pixelRatio - .25);
    this.frameTimes.length = 0;
  }

  paint(seconds, viewportTop, viewportHeight, tile = null) {
    if (this.lost) return;
    const overscan = Math.max(512,Math.ceil(viewportHeight*.75/256)*256);
    const viewportStart = Math.max(0, Math.floor((viewportTop-this.documentTop-overscan)/512)*512);
    const haloPadding=this.aura?Math.ceil(this.aura.halfHeight*1.5):8;
    const top = tile ? tile.top : this.aura ? Math.floor(this.minY)-haloPadding : Math.max(viewportStart, Math.floor(this.minY) - 8);
    const bottom = tile ? tile.bottom : this.aura ? Math.ceil(this.maxY)+haloPadding : Math.min(viewportStart + Math.ceil((viewportHeight+2*overscan+512)/256)*256, Math.ceil(this.maxY) + 8);
    const visible = bottom > top;
    if (this.canvas.hidden === visible) this.canvas.hidden = !visible;
    if (!visible) return;
    let left = this.width, right = 0;
    for (let band = Math.floor(top / 64) - 1; band <= Math.ceil(bottom / 64) + 1; band++) {
      const bounds = this.bands.get(band);
      if (bounds) { left = Math.min(left, bounds[0]); right = Math.max(right, bounds[1]); }
    }
    left = Math.max(0, Math.floor(left) - 8);
    right = Math.min(this.width, Math.ceil(right) + 8);
    const width = Math.max(1, right - left), height = bottom - top;
    // This surface is bounded by the viewport, not the length of the article.
    const ratio = tile ? 1 : Math.min(devicePixelRatio || 1, this.pixelRatio);
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth; this.canvas.height = pixelHeight;
      this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
      this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    if (this.lastTop !== top) { this.canvas.style.top = `${top}px`; this.lastTop = top; }
    if (this.lastLeft !== left) { this.canvas.style.left = `${left}px`; this.lastLeft = left; }
    const gl = this.gl;
    gl.uniform4f(this.uniforms.view, width, height, left, top);
    gl.uniform1f(this.uniforms.time, seconds);
    const glow=this.glow;
    gl.uniform4f(this.uniforms.glowCenters,...(glow?.centers||[0,0,0,0]));
    gl.uniform4f(this.uniforms.glowStyle,glow?.radius||1,glow?.first||0,glow?.second||0,glow?.baseOpacity??1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(this.aura && (glow?.first||glow?.second)){
      // One cached quad shares the text canvas and clock; no extra contexts,
      // filters, moving DOM layers, or per-frame curve geometry are needed.
      if(!this.auraBuffer){
        this.auraBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.auraBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
      }else gl.bindBuffer(gl.ARRAY_BUFFER,this.auraBuffer);
      gl.vertexAttribPointer(this.attributes.position,2,gl.FLOAT,false,8,0);
      gl.disableVertexAttribArray(this.attributes.text);gl.vertexAttrib4f(this.attributes.text,0,0,0,0);
      gl.uniform4f(this.uniforms.auraCurve,this.aura.centre,this.aura.half,this.aura.depth,this.aura.base);
      gl.uniform1f(this.uniforms.auraWidth,this.aura.halfHeight);
      gl.uniform1f(this.uniforms.auraPass,1);gl.drawArrays(gl.TRIANGLES,0,6);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.vertexAttribPointer(this.attributes.position,2,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(this.attributes.text);gl.vertexAttribPointer(this.attributes.text,4,gl.FLOAT,false,24,8);
    }
    gl.uniform1f(this.uniforms.auraPass,0);
    // Submit only visible sections of each track, including on software GPUs.
    // Geometry stays cached; scrolling only changes these buffer ranges.
    this.meshRows.forEach(chunks => {
      let first = Infinity, end = 0;
      for (const chunk of chunks) if (chunk.maxY >= top && chunk.minY <= bottom) {
        first = Math.min(first, chunk.first); end = Math.max(end, chunk.first + chunk.count);
      }
      if (end) gl.drawArrays(gl.TRIANGLES, first, end - first);
    });
  }
}
