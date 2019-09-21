const renderVertex = `#version 300 es

precision highp float;

out vec2 v_uv;

uniform float u_size;
uniform mat4 u_mvpMatrix;

const vec3[4] POSITIONS = vec3[](
  vec3(-1.0, -1.0, 0.0),
  vec3(1.0, -1.0, 0.0),
  vec3(-1.0, 1.0, 0.0),
  vec3(1.0, 1.0, 0.0)
);

const vec2[4] UVS = vec2[](
  vec2(0.0, 0.0),
  vec2(1.0, 0.0),
  vec2(0.0, 1.0),
  vec2(1.0, 1.0)
);

const int[6] INDICES = int[](
  0, 1, 2,
  3, 2, 1
);

void main(void) {
  int index = INDICES[gl_VertexID];
  gl_Position = u_mvpMatrix * vec4(u_size * POSITIONS[index], 1.0);
  v_uv = UVS[index];
}
`

const renderFragment = `#version 300 es

precision highp float;

in vec2 v_uv;

out vec4 o_color;

uniform float u_size;
uniform mat4 u_modelMatrix;
uniform mat4 u_vpMatrix;

vec3 lightDir = normalize(vec3(0.0, 1.0, 1.0));

void main(void) {
  vec2 st = v_uv * 2.0 - 1.0;

  if (length(st) > 1.0) discard;

  vec3 objPos = u_size * vec3(st.x, st.y, sqrt(1.0 - st.x * st.x - st.y * st.y));
  vec3 objNormal = normalize(objPos);
  vec3 worldNormal = (u_modelMatrix * vec4(objNormal, 0.0)).xyz;

  vec3 ambient = vec3(0.2);
  vec3 diffuse = vec3(0.3, 0.5, 0.8) * clamp(dot(worldNormal, lightDir), 0.0, 1.0);

  o_color = vec4(ambient + diffuse, 1.0);
}
`;

function createShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) + source);
  }
  return shader;
}

function createProgram(gl, vertShader, fragShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function getUniformLocs(gl, program, names) {
  const map = new Map();
  names.forEach((name) => map.set(name, gl.getUniformLocation(program, name)));
  return map;
}

const canvas = document.getElementById('canvas');
canvas.width = innerWidth;
canvas.height = innerHeight;
const gl = canvas.getContext('webgl2');
gl.clearColor(0.5, 0.5, 0.5, 1.0);

const program = createProgram(gl,
  createShader(gl, renderVertex, gl.VERTEX_SHADER),
  createShader(gl, renderFragment, gl.FRAGMENT_SHADER));
const uniformLocs = getUniformLocs(gl, program, ['u_size', 'u_modelMatrix', 'u_vpMatrix', 'u_mvpMatrix']);

const mouse = [0.0, 0.0];
canvas.addEventListener('mousemove', e => {
  mouse[0] = e.clientX / canvas.width;
  mouse[1] = (canvas.height - e.clientY) / canvas.height;
});

let projMatrix = Matrix4.perspective(canvas.width / canvas.height, 60.0, 0.1, 1000.0);
let requestId = null;
const render = () => {
  const spherePos = new Vector3(0.0, 0.0, 0.0);
  const cameraPos = new Vector3(10.0 * (2.0 * mouse[0] - 1.0), 10.0 * (2.0 * mouse[1] - 1.0), 5.0);
  const cameraTarget = new Vector3(0.0, 0.0, 0.0);
  const cameraUp = new Vector3(0.0, 1.0, 0.0);
  const cameraMatrix = Matrix4.lookAt(cameraPos, cameraTarget, cameraUp);
  const modelTransMatrix = Matrix4.translate(spherePos.x, spherePos.y, spherePos.z);
  const modelRotMatrix = Matrix4.lookTo(Vector3.sub(spherePos, cameraPos).norm(), cameraUp);

  const modelMatrix = Matrix4.mul(modelRotMatrix, modelTransMatrix);
  const viewMatrix = Matrix4.inverse(cameraMatrix);
  const vpMatrix = Matrix4.mul(viewMatrix, projMatrix);
  const mvpMatrix = Matrix4.mul(modelMatrix, vpMatrix);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform1f(uniformLocs.get('u_size'), 1.0);
  gl.uniformMatrix4fv(uniformLocs.get('u_modelMatrix'), false, modelMatrix.elements);
  gl.uniformMatrix4fv(uniformLocs.get('u_vpMatrix'), false, vpMatrix.elements);
  gl.uniformMatrix4fv(uniformLocs.get('u_mvpMatrix'), false, mvpMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
 
  requestId = requestAnimationFrame(render);
};

addEventListener('resize', () => {
  if (requestId !== null) {
    cancelAnimationFrame(requestId);
  }
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  projMatrix = Matrix4.perspective(canvas.width / canvas.height, 60.0, 0.1, 100.0);
  gl.viewport(0.0, 0.0, canvas.width, canvas.height);
  requestId = requestAnimationFrame(render);
});

requestId = requestAnimationFrame(render);