/* A fixed, warped mesh with scrolling lettering sampled on the GPU. No glyph
   nodes, per-frame geometry uploads, font layout, or full-page drawing surface. */
class RibbonGraphics {
  constructor(svg) {
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
      varying highp vec4 v_text;
      void main() {
        gl_Position = vec4((a_position.x - u_view.z) / u_view.x * 2.0 - 1.0,
          1.0 - (a_position.y - u_view.w) / u_view.y * 2.0, 0.0, 1.0);
        v_text = a_text;
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
      varying highp vec4 v_text;
      void main() {
        float character = v_text.x - u_time * v_text.w;
        float index = v_text.z * u_length + mod(floor(character) - 1.0, u_length);
        vec2 lookup = vec2(mod(index, u_lookupSize.x), floor(index / u_lookupSize.x));
        vec4 encoded = texture2D(u_letters, (lookup + 0.5) / u_lookupSize);
        float glyph = floor(encoded.r * 255.0 + 0.5) + floor(encoded.g * 255.0 + 0.5) * 256.0;
        vec2 cell = vec2(mod(glyph, 16.0), floor(glyph / 16.0));
        vec2 pixel = cell * u_atlasSize.zw + 2.0 + vec2(fract(character), v_text.y) * u_inkSize;
        float alpha = texture2D(u_atlas, pixel / u_atlasSize.xy).a;
        gl_FragColor = vec4(vec3(241.0, 240.0, 237.0) / 255.0 * alpha, alpha);
      }`);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertex); gl.attachShader(this.program, fragment);
    gl.linkProgram(this.program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
    this.uniforms = Object.fromEntries(['view','atlas','letters','lookupSize','atlasSize','inkSize','length','time']
      .map(name => [name, gl.getUniformLocation(this.program, `u_${name}`)]));
    this.buffer = gl.createBuffer();
    this.textures = [];
    this.pixelRatio = Math.min(devicePixelRatio || 1, 2);
    this.frameTimes = [];
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    svg.after(this.canvas);
    // Context loss must leave a quiet, static fallback, not a busy failed loop.
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.lost = true; this.canvas.hidden = true;
      ribbonRenderKey = ''; scheduleLayout();
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.canvas.remove(); ribbonGraphics = null; ribbonRenderKey = ''; scheduleLayout();
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

  paint(seconds, viewportTop, viewportHeight) {
    if (this.lost) return;
    const viewportStart = Math.max(0, viewportTop - this.documentTop - 128);
    const top = Math.max(viewportStart, Math.floor(this.minY) - 8);
    const bottom = Math.min(viewportStart + viewportHeight + 256, Math.ceil(this.maxY) + 8);
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
    const ratio = Math.min(devicePixelRatio || 1, this.pixelRatio);
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
    gl.clear(gl.COLOR_BUFFER_BIT);
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
