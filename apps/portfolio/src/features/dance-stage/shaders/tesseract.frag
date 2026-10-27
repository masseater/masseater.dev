// note: 4 次元の立方体を 2 つの面でゆっくり回し、3 次元を経て画面へ投影した線を、踊る人の前に重ねる。32 本の辺が裏返りながら形を変える。
vec2 project(vec4 v) {
  float a = time * 0.5;
  float b = time * 0.3;
  v.xw = rot(v.xw, a);
  v.yz = rot(v.yz, b);
  float w = 1.0 / (2.6 - v.w);
  vec3 p = v.xyz * w;
  p.xz = rot(p.xz, time * 0.2);
  float z = 1.0 / (2.5 - p.z);
  return vec2(0.5 + p.x * z * 0.9 / aspect(), 0.5 + p.y * z * 0.9);
}
void main() {
  vec3 c = rgb(uv) * 0.5;
  float d = 9.0;
  vec2 corners[16];
  for (int i = 0; i < 16; i++) {
    corners[i] = project(vec4(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1), float((i >> 3) & 1)) * 2.0 - 1.0);
  }
  for (int i = 0; i < 16; i++) {
    for (int k = 0; k < 4; k++) {
      int j = i ^ (1 << k);
      if (j < i) continue;
      d = min(d, segment(uv, corners[i], corners[j]));
    }
  }
  c += vec3(0.4, 0.9, 1.0) * smoothstep(0.004, 0.001, d);
  outColor = vec4(c, 1.0);
}
