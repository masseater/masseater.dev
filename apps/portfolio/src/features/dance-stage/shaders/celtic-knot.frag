// note: 帯が交差するたびに上と下を交互に通る組紐文様を画面に敷き、帯の中にだけ踊る人の映像を通す。上を通る帯には影を付けて重なりを見せる。
void main() {
  float s = 18.0;
  vec2 q = uv * vec2(aspect(), 1.0) * s;
  vec2 cell = floor(q);
  vec2 f = fract(q) - 0.5;
  float d1 = abs(f.x + f.y);
  float d2 = abs(f.x - f.y);
  float d1b = abs(abs(f.x + f.y) - 1.0);
  float d2b = abs(abs(f.x - f.y) - 1.0);
  float a = min(d1, d1b);
  float b = min(d2, d2b);
  float over = mod(cell.x + cell.y, 2.0);
  float bandA = smoothstep(0.24, 0.2, a);
  float bandB = smoothstep(0.24, 0.2, b);
  float edgeA = smoothstep(0.2, 0.17, a);
  float edgeB = smoothstep(0.2, 0.17, b);
  vec3 video = rgb(uv) * 1.1;
  vec3 c = vec3(0.08, 0.1, 0.08);
  if (over > 0.5) {
    c = mix(c, vec3(0.02), bandB); c = mix(c, video * 0.7, edgeB);
    c = mix(c, vec3(0.02), bandA); c = mix(c, video, edgeA);
  } else {
    c = mix(c, vec3(0.02), bandA); c = mix(c, video * 0.7, edgeA);
    c = mix(c, vec3(0.02), bandB); c = mix(c, video, edgeB);
  }
  outColor = vec4(c, 1.0);
}
