#version 300 es
precision highp float;
uniform sampler2D dance;
uniform vec2 resolution;
uniform float time;
uniform float frame;
uniform vec4 pose[33];
uniform vec4 lastPose[33];
uniform sampler2D history;
uniform sampler2D glyphs;
uniform float textWidth[8];
uniform float level;
uniform float bands[8];
uniform float beat;
uniform float beatCount;
in vec2 uv;
out vec4 outColor;
vec4 read(sampler2D target, vec2 p) { return texture(target, vec2(p.x, 1.0 - p.y)); }
