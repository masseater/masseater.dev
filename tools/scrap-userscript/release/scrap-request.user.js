// ==UserScript==
// @name         Scrap request to Claude
// @namespace    https://masseater.dev
// @version      1.2.1
// @description  閲覧中のページを masseater.dev の scrap にするよう、Claude Code のルーチンへ頼む。personal.masseater.dev にログインできる持ち主専用
// @homepageURL  https://github.com/masseater/masseater.dev/tree/main/tools/scrap-userscript
// @match        *://*/*
// @connect      personal.masseater.dev
// @grant        GM.openInTab
// @grant        GM.registerMenuCommand
// @grant        GM.xmlHttpRequest
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var pipeArguments = (self, args) => {
		switch (args.length) {
			case 0: return self;
			case 1: return args[0](self);
			case 2: return args[1](args[0](self));
			case 3: return args[2](args[1](args[0](self)));
			case 4: return args[3](args[2](args[1](args[0](self))));
			case 5: return args[4](args[3](args[2](args[1](args[0](self)))));
			case 6: return args[5](args[4](args[3](args[2](args[1](args[0](self))))));
			case 7: return args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))));
			case 8: return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self))))))));
			case 9: return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))));
			default: {
				let ret = self;
				for (let i = 0, len = args.length; i < len; i++) ret = args[i](ret);
				return ret;
			}
		}
	};
	var Prototype$1 = { pipe() {
		return pipeArguments(this, arguments);
	} };
	var Class$1 = function() {
		function PipeableBase() {}
		PipeableBase.prototype = Prototype$1;
		return PipeableBase;
	}();
	var dual = function(arity, body) {
		if (typeof arity === "function") return function() {
			return arity(arguments) ? body.apply(this, arguments) : (self) => body(self, ...arguments);
		};
		switch (arity) {
			case 0:
			case 1: throw new RangeError(`Invalid arity ${arity}`);
			case 2: return function(a, b) {
				if (arguments.length >= 2) return body(a, b);
				return function(self) {
					return body(self, a);
				};
			};
			case 3: return function(a, b, c) {
				if (arguments.length >= 3) return body(a, b, c);
				return function(self) {
					return body(self, a, b);
				};
			};
			default: return function() {
				if (arguments.length >= arity) return body.apply(this, arguments);
				const args = arguments;
				return function(self) {
					return body(self, ...args);
				};
			};
		}
	};
	var identity = (a) => a;
	var constant = (value) => () => value;
	var constTrue = constant(true);
	var constUndefined = constant(void 0);
	var constVoid = constUndefined;
	function memoize(f) {
		const cache = new WeakMap();
		return (a) => {
			const cached = cache.get(a);
			if (cached !== void 0) return cached;
			const result = f(a);
			cache.set(a, result);
			return result;
		};
	}
	function memoizeIdempotent(f) {
		const cache = new WeakMap();
		return (a) => {
			const cached = cache.get(a);
			if (cached !== void 0) return cached;
			const result = f(a);
			cache.set(a, result);
			if (result !== a) cache.set(result, result);
			return result;
		};
	}
	var getAllObjectKeys = (obj) => {
		const keys = new Set(Reflect.ownKeys(obj));
		if (obj.constructor === Object) return keys;
		if (obj instanceof Error) keys.delete("stack");
		const proto = Object.getPrototypeOf(obj);
		let current = proto;
		while (current !== null && current !== Object.prototype) {
			const ownKeys = Reflect.ownKeys(current);
			for (let i = 0; i < ownKeys.length; i++) keys.add(ownKeys[i]);
			current = Object.getPrototypeOf(current);
		}
		if (keys.has("constructor") && typeof obj.constructor === "function" && proto === obj.constructor.prototype) keys.delete("constructor");
		return keys;
	};
	var byReferenceInstances = new WeakSet();
	var viewBytes = (view) => new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
	var isArrayBufferLike = (u) => u instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && u instanceof SharedArrayBuffer;
	var bufferBytes = (buffer) => {
		try {
			return new Uint8Array(buffer);
		} catch {
			return;
		}
	};
	var backEdges = 0;
	var addBackEdge = () => {
		backEdges++;
	};
	function isString$1(input) {
		return typeof input === "string";
	}
	function isFunction(input) {
		return typeof input === "function";
	}
	function isNotNullish(input) {
		return input != null;
	}
	function isObjectKeyword(input) {
		return typeof input === "object" && input !== null || isFunction(input);
	}
	var hasProperty = dual(2, (self, property) => isObjectKeyword(self) && property in self);
	var symbol$1 = "~effect/Hash";
	var hash = (self) => {
		switch (typeof self) {
			case "number": return number$1(self);
			case "bigint": return string$1(self.toString(10));
			case "string": return string$1(self);
			case "function":
			case "object": if (self === null) break;
			else if (self instanceof Date) {
				if (Number.isNaN(self.getTime())) return string$1("Invalid Date");
				return string$1(self.toISOString());
			} else if (self instanceof RegExp) return string$1(self.toString());
			else {
				if (byReferenceInstances.has(self)) return random(self);
				const cached = hashCache.get(self);
				if (cached !== void 0) return cached;
				if (visitedObjects.has(self)) {
					addBackEdge();
					return string$1("[Circular]");
				}
				visitedObjects.add(self);
				const seen = backEdges;
				let h;
				try {
					if ("~effect/Hash" in self) h = self[symbol$1]();
					else if (typeof self === "function") h = random(self);
					else if (isArrayBufferLike(self)) {
						const bytes = bufferBytes(self);
						h = bytes === void 0 ? random(self) : array(bytes);
					} else if (self instanceof DataView) h = array(viewBytes(self));
					else if (Array.isArray(self) || ArrayBuffer.isView(self)) h = array(self);
					else if (self instanceof Map) h = hashMap(self);
					else if (self instanceof Set) h = hashSet(self);
					else h = structure(self);
				} finally {
					visitedObjects.delete(self);
				}
				if (seen === backEdges) hashCache.set(self, h);
				return h;
			}
		}
		return optimize(mix(string$1(String(self))));
	};
	var random = (self) => {
		if (!randomHashCache.has(self)) randomHashCache.set(self, optimize(Math.random() * 4294967296 | 0));
		return randomHashCache.get(self);
	};
	var mix = (h) => {
		h ^= h >>> 16;
		h = Math.imul(h, 2246822507);
		h ^= h >>> 13;
		h = Math.imul(h, 3266489909);
		return h ^ h >>> 16;
	};
	var combine = dual(2, (self, b) => mix(Math.imul(self, 2654435761) + Math.imul(b, 2246822507)));
	var optimize = (n) => n & 3221225471 | n >>> 1 & 1073741824;
	var float64 = new DataView(new ArrayBuffer(8));
	var number$1 = (n) => {
		const h = n | 0;
		if (h === n) return optimize(h);
		float64.setFloat64(0, n !== n ? NaN : n);
		return optimize(combine(float64.getInt32(0), float64.getInt32(4)));
	};
	var string$1 = (str) => {
		let h = 5381, i = str.length;
		while (i) h = h * 33 ^ str.charCodeAt(--i);
		return optimize(h);
	};
	var structureKeys = (o, keys) => {
		let h = 12289;
		for (const key of keys) h ^= combine(hash(key), hash(o[key]));
		return optimize(h);
	};
	var structure = (o) => structureKeys(o, getAllObjectKeys(o));
	var unordered = (seed, f) => (iter) => {
		let h = seed;
		for (const element of iter) h ^= f(element);
		return optimize(h);
	};
	var array = (arr) => {
		let h = 6151;
		for (const element of arr) h = combine(h, hash(element));
		return optimize(h);
	};
	var hashMap = unordered(string$1("Map"), ([k, v]) => combine(hash(k), hash(v)));
	var setSeed = string$1("Set");
	var hashSet = unordered(setSeed, (element) => combine(setSeed, hash(element)));
	var randomHashCache = new WeakMap();
	var hashCache = new WeakMap();
	var visitedObjects = new WeakSet();
	var symbol = "~effect/Equal";
	function equals$1() {
		if (arguments.length === 1) return (self) => compareBoth(self, arguments[0]);
		return compareBoth(arguments[0], arguments[1]);
	}
	function compareBoth(self, that) {
		if (self === that) return true;
		if (self == null || that == null) return false;
		const selfType = typeof self;
		if (selfType !== typeof that) return false;
		if (selfType === "number" && self !== self && that !== that) return true;
		if (selfType !== "object" && selfType !== "function") return false;
		if (byReferenceInstances.has(self) || byReferenceInstances.has(that)) return false;
		return compareObjects(self, that);
	}
	function compareObjects(self, that) {
		const depth = pathLeft.length;
		for (let i = depth; i-- > 0;) if (pathLeft[i] === self && pathRight[i] === that) return true;
		if (depth) return compareOnPath(self, that);
		let known = results.get(self);
		if (!known) results.set(self, known = new WeakMap());
		let result = known.get(that);
		if (result === void 0) known.set(that, result = compareOnPath(self, that));
		return result;
	}
	function compareOnPath(self, that) {
		pathLeft.push(self);
		pathRight.push(that);
		try {
			return compareStructure(self, that);
		} finally {
			pathLeft.pop();
			pathRight.pop();
		}
	}
	var pathLeft = [];
	var pathRight = [];
	var results = new WeakMap();
	function compareStructure(self, that) {
		if (hash(self) !== hash(that)) return false;
		else if (self instanceof Date) {
			if (!(that instanceof Date)) return false;
			const selfTime = self.getTime();
			const thatTime = that.getTime();
			return selfTime === thatTime || Number.isNaN(selfTime) && Number.isNaN(thatTime);
		} else if (self instanceof RegExp) return that instanceof RegExp && self.toString() === that.toString();
		const bothEquals = isEqual(self);
		if (bothEquals !== isEqual(that) || typeof self === "function" && !bothEquals) return false;
		else if (bothEquals) return self[symbol](that);
		else if (Array.isArray(self)) {
			if (!Array.isArray(that) || self.length !== that.length) return false;
			return compareArrays(self, that);
		} else if (isArrayBufferLike(self)) {
			if (!isArrayBufferLike(that) || self instanceof ArrayBuffer !== that instanceof ArrayBuffer) return false;
			const selfBytes = bufferBytes(self);
			const thatBytes = bufferBytes(that);
			return selfBytes !== void 0 && thatBytes !== void 0 && compareTypedArrays(selfBytes, thatBytes);
		} else if (ArrayBuffer.isView(self)) {
			const selfIsDataView = self instanceof DataView;
			if (!ArrayBuffer.isView(that) || self.byteLength !== that.byteLength || selfIsDataView !== that instanceof DataView) return false;
			if (selfIsDataView) return compareTypedArrays(viewBytes(self), viewBytes(that));
			return compareTypedArrays(self, that);
		} else if (self instanceof Map) {
			if (!(that instanceof Map) || self.size !== that.size) return false;
			return compareHashed(self, that, entryHash, equalEntries);
		} else if (self instanceof Set) {
			if (!(that instanceof Set) || self.size !== that.size) return false;
			return compareHashed(self, that, hash, compareBoth);
		}
		return compareRecords(self, that);
	}
	function compareArrays(self, that) {
		for (let i = 0; i < self.length; i++) if (!compareBoth(self[i], that[i])) return false;
		return true;
	}
	function compareTypedArrays(self, that) {
		if (self.length !== that.length) return false;
		for (let i = 0; i < self.length; i++) if (self[i] !== that[i]) return false;
		return true;
	}
	function compareRecords(self, that) {
		const selfKeys = getAllObjectKeys(self);
		const thatKeys = getAllObjectKeys(that);
		if (selfKeys.size !== thatKeys.size) return false;
		for (const key of selfKeys) if (!thatKeys.has(key) || !compareBoth(self[key], that[key])) return false;
		return true;
	}
	function compareHashed(self, that, hashOf, equivalent) {
		const groups = new Map();
		let remaining = 0;
		for (const item of that) {
			const h = hashOf(item);
			const group = groups.get(h);
			if (group) group.push(item);
			else groups.set(h, [item]);
			remaining++;
		}
		outer: for (const item of self) {
			const group = groups.get(hashOf(item));
			if (group) {
				for (let i = 0; i < group.length; i++) if (equivalent(item, group[i])) {
					group[i] = group[group.length - 1];
					group.pop();
					remaining--;
					continue outer;
				}
			}
			return false;
		}
		return remaining === 0;
	}
	var entryHash = (entry) => hash(entry[0]);
	var equalEntries = (self, that) => compareBoth(self[0], that[0]) && compareBoth(self[1], that[1]);
	var isEqual = (u) => hasProperty(u, symbol);
	var symbolRedactable = Symbol.for("~effect/Redactable");
	var isRedactable = (u) => hasProperty(u, symbolRedactable);
	function redact$2(u) {
		if (isRedactable(u)) return getRedacted(u);
		return u;
	}
	function getRedacted(redactable) {
		return redactable[symbolRedactable](globalThis["~effect/Fiber/currentFiber"]?.context ?? emptyContext$1);
	}
	var currentFiberTypeId = "~effect/Fiber/currentFiber";
	var emptyMap = new Map();
	var emptyContext$1 = {
		"~effect/Context": {},
		base: emptyMap,
		depth: 0,
		mapUnsafe: emptyMap,
		pipe() {
			return pipeArguments(this, arguments);
		}
	};
	function format$1(input, options) {
		const space = options?.space ?? 0;
		const ancestors = new WeakSet();
		const gap = !space ? "" : typeof space === "number" ? " ".repeat(space) : space;
		const ind = (d) => gap.repeat(d);
		const wrap = (v, body) => {
			const ctor = v?.constructor;
			return ctor && ctor !== Object.prototype.constructor && ctor.name ? `${ctor.name}(${body})` : body;
		};
		const ownKeys = (o) => {
			try {
				return Reflect.ownKeys(o);
			} catch {
				return ["[ownKeys threw]"];
			}
		};
		function recur(v, d = 0) {
			try {
				return recurUnsafe(v, d);
			} catch {
				if (typeof v === "object" && v !== null || typeof v === "function") ancestors.delete(v);
				return "[inspection threw]";
			}
		}
		function recurUnsafe(v, d = 0) {
			if (typeof v === "string") return JSON.stringify(v);
			if (typeof v === "number" || v == null || typeof v === "boolean" || typeof v === "symbol") return String(v);
			if (typeof v === "bigint") return String(v) + "n";
			if (typeof v === "object" || typeof v === "function") {
				if (ancestors.has(v)) return CIRCULAR;
				ancestors.add(v);
				let output;
				if (symbolRedactable in v) output = recur(getRedacted(v), d);
				else if (Array.isArray(v)) output = !gap || v.length <= 1 ? `[${v.map((x) => recur(x, d)).join(",")}]` : `[\n${ind(d + 1)}${v.map((x) => recur(x, d + 1)).join(",\n" + ind(d + 1))}\n${ind(d)}]`;
				else if (v instanceof Date) output = formatDate(v);
				else if (!options?.ignoreToString && hasProperty(v, "toString") && typeof v["toString"] === "function" && v["toString"] !== Object.prototype.toString && v["toString"] !== Array.prototype.toString) {
					const s = safeToString(v);
					output = v instanceof Error && v.cause !== void 0 ? `${s} (cause: ${recur(v.cause, d)})` : s;
				} else if (Symbol.iterator in v) output = `${v.constructor.name}(${recur(Array.from(v), d)})`;
				else {
					const keys = ownKeys(v);
					if (!gap || keys.length <= 1) {
						const body = `{${keys.map((k) => `${formatPropertyKey(k)}:${recur(safeGet(v, k), d)}`).join(",")}}`;
						output = wrap(v, body);
					} else {
						const body = `{\n${keys.map((k) => `${ind(d + 1)}${formatPropertyKey(k)}: ${recur(safeGet(v, k), d + 1)}`).join(",\n")}\n${ind(d)}}`;
						output = wrap(v, body);
					}
				}
				ancestors.delete(v);
				return output;
			}
			return String(v);
		}
		return recur(input, 0);
	}
	var CIRCULAR = "[Circular]";
	function formatPropertyKey(name) {
		return typeof name === "string" ? JSON.stringify(name) : String(name);
	}
	function formatDate(date) {
		try {
			return date.toISOString();
		} catch {
			return "Invalid Date";
		}
	}
	function safeToString(input) {
		try {
			const s = input.toString();
			return typeof s === "string" ? s : String(s);
		} catch {
			return "[toString threw]";
		}
	}
	function safeGet(input, key) {
		try {
			return input[key];
		} catch {
			return "[property access threw]";
		}
	}
	var NodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom");
	var toJson = (input) => {
		try {
			input = redact$2(input);
			if (hasProperty(input, "toJSON") && isFunction(input["toJSON"]) && input["toJSON"].length === 0) return input.toJSON();
			else if (Array.isArray(input)) return input.map(toJson);
			return input;
		} catch {
			return "[toJSON threw]";
		}
	};
	var BaseProto = {
		toJSON() {
			return toJson(this);
		},
		[NodeInspectSymbol]() {
			return this.toJSON();
		},
		toString() {
			return format$1(this.toJSON());
		}
	};
	var isStackTraceLimitWritable = () => {
		const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
		if (desc === void 0) return Object.isExtensible(Error);
		return Object.hasOwn(desc, "writable") ? desc.writable === true : desc.set !== void 0;
	};
	var canWriteStackTraceLimit = isStackTraceLimitWritable();
	var getStackTraceLimit = () => Error.stackTraceLimit;
	var setStackTraceLimit = (value) => {
		if (canWriteStackTraceLimit) Error.stackTraceLimit = value;
	};
	var SingleShotGen = class {
		constructor(self) {
			this.value = self;
			this.done = false;
		}
		next(a) {
			if (this.done) {
				this.value = a;
				return this;
			}
			this.done = true;
			return {
				value: this.value,
				done: false
			};
		}
	};
	var pickInternalCall = () => {
		const InternalTypeId = "~effect/Utils/internal";
		const standard = { [InternalTypeId]: (body) => {
			return body();
		} };
		const forced = { [InternalTypeId]: (body) => {
			try {
				return body();
			} finally {}
		} };
		const limit = getStackTraceLimit();
		if (limit === 0) return forced[InternalTypeId];
		setStackTraceLimit(2);
		const error = standard[InternalTypeId](() => new Error());
		setStackTraceLimit(limit);
		return error.stack?.includes(InternalTypeId) === true ? standard[InternalTypeId] : forced[InternalTypeId];
	};
	var internalCall = pickInternalCall();
	function assignProperty(self, key, value) {
		if (key === "__proto__") Object.defineProperty(self, key, {
			value,
			writable: true,
			enumerable: true,
			configurable: true
		});
		else self[key] = value;
	}
	function assignProperties(self, source) {
		if (!Object.hasOwn(source, "__proto__")) {
			Object.assign(self, source);
			return;
		}
		for (const key of Reflect.ownKeys(source)) if (Object.prototype.propertyIsEnumerable.call(source, key)) assignProperty(self, key, source[key]);
	}
	var EffectTypeId = `~effect/Effect`;
	var ExitTypeId = `~effect/Exit`;
	var effectVariance = {
		_A: identity,
		_E: identity,
		_R: identity
	};
	var identifier = `${EffectTypeId}/identifier`;
	var args = `${EffectTypeId}/args`;
	var evaluate = `${EffectTypeId}/evaluate`;
	var contA = `${EffectTypeId}/successCont`;
	var contE = `${EffectTypeId}/failureCont`;
	var contAll = `${EffectTypeId}/ensureCont`;
	var Yield = Symbol.for("effect/Effect/Yield");
	var PipeInspectableProto = {
		pipe() {
			return pipeArguments(this, arguments);
		},
		toJSON() {
			return { ...this };
		},
		toString() {
			return format$1(this.toJSON(), {
				ignoreToString: true,
				space: 2
			});
		},
		[NodeInspectSymbol]() {
			return this.toJSON();
		}
	};
	var EffectProto = {
		[EffectTypeId]: effectVariance,
		...PipeInspectableProto,
		[Symbol.iterator]() {
			return new SingleShotGen(this);
		},
		toJSON() {
			return {
				_id: "Effect",
				op: this[identifier],
				..."~effect/Effect/args" in this ? { args: this[args] } : void 0
			};
		}
	};
	var isExit = (u) => hasProperty(u, ExitTypeId);
	var CauseTypeId = "~effect/Cause";
	var CauseReasonTypeId = "~effect/Cause/Reason";
	var isCause = (self) => hasProperty(self, CauseTypeId);
	var CauseImpl = class {
		constructor(failures) {
			this[CauseTypeId] = CauseTypeId;
			this.reasons = failures;
		}
		pipe() {
			return pipeArguments(this, arguments);
		}
		toJSON() {
			return {
				_id: "Cause",
				reasons: this.reasons.map((f) => f.toJSON())
			};
		}
		toString() {
			return `Cause(${format$1(this.reasons)})`;
		}
		[NodeInspectSymbol]() {
			return this.toJSON();
		}
		[symbol](that) {
			return isCause(that) && this.reasons.length === that.reasons.length && this.reasons.every((e, i) => equals$1(e, that.reasons[i]));
		}
		[symbol$1]() {
			return array(this.reasons);
		}
	};
	var annotationsMap = new WeakMap();
	var ReasonBase = class {
		[CauseReasonTypeId];
		annotations;
		_tag;
		constructor(_tag, annotations, originalError) {
			this[CauseReasonTypeId] = CauseReasonTypeId;
			this._tag = _tag;
			if (annotations !== constEmptyAnnotations && typeof originalError === "object" && originalError !== null && annotations.size > 0) {
				const prevAnnotations = annotationsMap.get(originalError);
				if (prevAnnotations) annotations = new Map([...prevAnnotations, ...annotations]);
				annotationsMap.set(originalError, annotations);
			}
			this.annotations = annotations;
		}
		annotate(annotations, options) {
			if (annotations.mapUnsafe.size === 0) return this;
			const newAnnotations = new Map(this.annotations);
			annotations.mapUnsafe.forEach((value, key) => {
				if (options?.overwrite !== true && newAnnotations.has(key)) return;
				newAnnotations.set(key, value);
			});
			if (options?.overwrite !== true && newAnnotations.size === this.annotations.size) return this;
			const self = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
			self.annotations = newAnnotations;
			return self;
		}
		pipe() {
			return pipeArguments(this, arguments);
		}
		toString() {
			return format$1(this);
		}
		[NodeInspectSymbol]() {
			return this.toString();
		}
	};
	var constEmptyAnnotations = new Map();
	var Fail = class extends ReasonBase {
		constructor(error, annotations = constEmptyAnnotations) {
			super("Fail", annotations, error);
			this.error = error;
		}
		toString() {
			return `Fail(${format$1(this.error)})`;
		}
		toJSON() {
			return {
				_tag: "Fail",
				error: this.error
			};
		}
		[symbol](that) {
			return isFailReason$1(that) && equals$1(this.error, that.error) && equals$1(this.annotations, that.annotations);
		}
		[symbol$1]() {
			return combine(string$1(this._tag))(combine(hash(this.error))(hash(this.annotations)));
		}
	};
	var causeFromReasons = (reasons) => new CauseImpl(reasons);
	var dedupeReasons = (self, that) => {
		const buckets = new Map();
		const out = [];
		for (const reason of self.concat(that)) {
			const hash$2 = hash(reason);
			const bucket = buckets.get(hash$2);
			if (bucket === void 0) buckets.set(hash$2, [reason]);
			else if (bucket.some((previous) => equals$1(previous, reason))) continue;
			else bucket.push(reason);
			out.push(reason);
		}
		return out;
	};
	var causeCombine = dual(2, (self, that) => {
		if (self.reasons.length === 0) return that;
		else if (that.reasons.length === 0) return self;
		const newCause = new CauseImpl(dedupeReasons(self.reasons, that.reasons));
		return equals$1(self, newCause) ? self : newCause;
	});
	var causeAddInterrupts = (self, interrupts) => {
		const reasons = self.reasons.slice();
		for (const reason of interrupts.reasons) if (isInterruptReason(reason) && !reasons.some((r) => isInterruptReason(r) && r.fiberId === reason.fiberId && r.annotations === reason.annotations)) reasons.push(reason);
		return reasons.length === self.reasons.length ? self : new CauseImpl(reasons);
	};
	var causeFail = (error) => new CauseImpl([new Fail(error)]);
	var Die = class extends ReasonBase {
		constructor(defect, annotations = constEmptyAnnotations) {
			super("Die", annotations, defect);
			this.defect = defect;
		}
		toString() {
			return `Die(${format$1(this.defect)})`;
		}
		toJSON() {
			return {
				_tag: "Die",
				defect: this.defect
			};
		}
		[symbol](that) {
			return isDieReason(that) && equals$1(this.defect, that.defect) && equals$1(this.annotations, that.annotations);
		}
		[symbol$1]() {
			return combine(string$1(this._tag))(combine(hash(this.defect))(hash(this.annotations)));
		}
	};
	var causeDie = (defect) => new CauseImpl([new Die(defect)]);
	var causeAnnotate = dual((args) => isCause(args[0]), (self, annotations, options) => {
		if (annotations.mapUnsafe.size === 0) return self;
		return new CauseImpl(self.reasons.map((f) => f.annotate(annotations, options)));
	});
	var isFailReason$1 = (self) => self._tag === "Fail";
	var isDieReason = (self) => self._tag === "Die";
	var isInterruptReason = (self) => self._tag === "Interrupt";
	function defaultEvaluate(_fiber) {
		return exitDie(`Effect.evaluate: Not implemented`);
	}
	var makePrimitiveProto = (options) => ({
		...EffectProto,
		[identifier]: options.op,
		[evaluate]: options["~effect/Effect/evaluate"] ?? defaultEvaluate,
		[contA]: options[contA],
		[contE]: options[contE],
		[contAll]: options[contAll]
	});
	var makePrimitive = (options) => {
		const Proto = makePrimitiveProto(options);
		const PrimitiveImpl = function(value) {
			this[args] = value;
		};
		PrimitiveImpl.prototype = Proto;
		return function(value) {
			return new PrimitiveImpl(value);
		};
	};
	var makeExit = (options) => {
		const Proto = {
			[ExitTypeId]: ExitTypeId,
			_tag: options.op,
			get [options.prop]() {
				return this[args];
			},
			...makePrimitiveProto(options),
			toString() {
				return `${options.op}(${format$1(this[args])})`;
			},
			toJSON() {
				return {
					_id: "Exit",
					_tag: options.op,
					[options.prop]: this[args]
				};
			},
			[symbol](that) {
				return isExit(that) && that._tag === this._tag && equals$1(this["~effect/Effect/args"], that["~effect/Effect/args"]);
			},
			[symbol$1]() {
				return combine(string$1(options.op), hash(this[args]));
			}
		};
		const ExitPrimitive = function(value) {
			this[args] = value;
		};
		ExitPrimitive.prototype = Proto;
		return function(value) {
			return new ExitPrimitive(value);
		};
	};
	var exitSucceed = makeExit({
		op: "Success",
		prop: "value",
		[evaluate](fiber) {
			const cont = fiber.getCont(contA);
			return cont ? cont[contA](this[args], fiber, this) : fiber.yieldWith(this);
		}
	});
	var StackTraceKey = { key: "effect/Cause/StackTrace" };
	var InterruptorStackTrace = { key: "effect/Cause/InterruptorStackTrace" };
	var exitFailCause = makeExit({
		op: "Failure",
		prop: "cause",
		[evaluate](fiber) {
			let cause = this[args];
			let annotated = false;
			if (fiber.cache.stackFrame) {
				cause = causeAnnotate(cause, { mapUnsafe: new Map([[StackTraceKey.key, fiber.cache.stackFrame]]) });
				annotated = true;
			}
			let cont = fiber.getCont(contE);
			const interruptedCause = fiber._interruptedCause;
			if (interruptedCause && fiber.interruptible) {
				let skippedHandler = false;
				while (cont && fiber.interruptible) {
					skippedHandler ||= identifier in cont;
					cont = fiber.getCont(contE);
				}
				if (skippedHandler) cause = causeFromReasons(cause.reasons.filter((reason) => reason._tag !== "Fail"));
				cause = causeAddInterrupts(cause, interruptedCause);
				annotated = true;
			}
			return cont ? cont[contE](cause, fiber, annotated ? void 0 : this) : fiber.yieldWith(annotated ? exitFailCause(cause) : this);
		}
	});
	var exitFail = (e) => exitFailCause(causeFail(e));
	var exitDie = (defect) => exitFailCause(causeDie(defect));
	var withFiber = makePrimitive({
		op: "WithFiber",
		[evaluate](fiber) {
			return this[args](fiber);
		}
	});
	var YieldableError = function() {
		class YieldableError extends globalThis.Error {}
		const proto = makePrimitiveProto({
			op: "YieldableError",
			[evaluate]() {
				return exitFail(this);
			}
		});
		delete proto.toString;
		Object.assign(YieldableError.prototype, proto);
		return YieldableError;
	}();
	var Error$2 = function() {
		const plainArgsSymbol = Symbol.for("effect/Data/Error/plainArgs");
		return class Base extends YieldableError {
			constructor(args) {
				super(args?.message, args?.cause ? { cause: args.cause } : void 0);
				if (args) {
					assignProperties(this, args);
					Object.defineProperty(this, plainArgsSymbol, {
						value: args,
						enumerable: false
					});
				}
			}
			toJSON() {
				return {
					...this[plainArgsSymbol],
					...this
				};
			}
		};
	}();
	var TaggedError$1 = (tag) => {
		class Base extends Error$2 {
			_tag = tag;
		}
		Base.prototype.name = tag;
		return Base;
	};
	var DoneTypeId = "~effect/Cause/Done";
	var isDone = (u) => hasProperty(u, DoneTypeId);
	var Prototype = (options) => makePrimitiveProto({
		op: options.label,
		[evaluate]: options.evaluate
	});
	var TypeId$15 = "~effect/Option";
	var CommonProto$1 = {
		[TypeId$15]: { _A: (_) => _ },
		...PipeInspectableProto,
		[Symbol.iterator]() {
			return new SingleShotGen(this);
		}
	};
	var SomeProto = Object.defineProperty(Object.assign(Object.create(CommonProto$1), {
		_tag: "Some",
		_op: "Some",
		[symbol](that) {
			return isOption(that) && isSome$1(that) && equals$1(this.value, that.value);
		},
		[symbol$1]() {
			return combine(hash(this._tag))(hash(this.value));
		},
		toString() {
			return `some(${format$1(this.value)})`;
		},
		toJSON() {
			return {
				_id: "Option",
				_tag: this._tag,
				value: toJson(this.value)
			};
		}
	}), "valueOrUndefined", { get() {
		return this.value;
	} });
	var NoneHash = hash("None");
	var NoneProto = Object.assign(Object.create(CommonProto$1), {
		_tag: "None",
		_op: "None",
		valueOrUndefined: void 0,
		[symbol](that) {
			return isOption(that) && isNone$1(that);
		},
		[symbol$1]() {
			return NoneHash;
		},
		toString() {
			return `none()`;
		},
		toJSON() {
			return {
				_id: "Option",
				_tag: this._tag
			};
		}
	});
	var isOption = (input) => hasProperty(input, TypeId$15);
	var isNone$1 = (fa) => fa._tag === "None";
	var isSome$1 = (fa) => fa._tag === "Some";
	var none$1 = Object.create(NoneProto);
	var SomeImpl = function(value) {
		this.value = value;
	};
	SomeImpl.prototype = SomeProto;
	var some$1 = (value) => new SomeImpl(value);
	var TypeId$14 = "~effect/Result";
	var CommonProto = {
		[TypeId$14]: {
			_A: (_) => _,
			_E: (_) => _
		},
		...PipeInspectableProto,
		[Symbol.iterator]() {
			return new SingleShotGen(this);
		}
	};
	var SuccessProto = Object.assign(Object.create(CommonProto), {
		_tag: "Success",
		_op: "Success",
		[symbol](that) {
			return isResult(that) && isSuccess$2(that) && equals$1(this.success, that.success);
		},
		[symbol$1]() {
			return combine(hash(this._tag))(hash(this.success));
		},
		toString() {
			return `success(${format$1(this.success)})`;
		},
		toJSON() {
			return {
				_id: "Result",
				_tag: this._tag,
				value: toJson(this.success)
			};
		}
	});
	var FailureProto = Object.assign(Object.create(CommonProto), {
		_tag: "Failure",
		_op: "Failure",
		[symbol](that) {
			return isResult(that) && isFailure$1(that) && equals$1(this.failure, that.failure);
		},
		[symbol$1]() {
			return combine(hash(this._tag))(hash(this.failure));
		},
		toString() {
			return `failure(${format$1(this.failure)})`;
		},
		toJSON() {
			return {
				_id: "Result",
				_tag: this._tag,
				failure: toJson(this.failure)
			};
		}
	});
	var isResult = (input) => hasProperty(input, TypeId$14);
	var isFailure$1 = (result) => result._tag === "Failure";
	var isSuccess$2 = (result) => result._tag === "Success";
	var FailureImpl = function(failure) {
		this.failure = failure;
	};
	FailureImpl.prototype = FailureProto;
	var fail$5 = (failure) => new FailureImpl(failure);
	var SuccessImpl = function(success) {
		this.success = success;
	};
	SuccessImpl.prototype = SuccessProto;
	var succeed$5 = (success) => new SuccessImpl(success);
	var none = () => none$1;
	var some = some$1;
	var isNone = isNone$1;
	var match$4 = dual(2, (self, { onNone, onSome }) => isNone(self) ? onNone() : onSome(self.value));
	var getOrElse = dual(2, (self, onNone) => isNone(self) ? onNone() : self.value);
	var fromNullishOr = (a) => a == null ? none() : some(a);
	var map$5 = dual(2, (self, f) => isNone(self) ? none() : some(f(self.value)));
	var ServiceTypeId = "~effect/Context/Service";
	var Service = function() {
		function KeyClass() {}
		const self = KeyClass;
		Object.setPrototypeOf(self, ServiceProto);
		const init = (key, options) => {
			self.key = key;
			if (options?.defaultValue) {
				self[ReferenceTypeId] = ReferenceTypeId;
				self.defaultValue = options.defaultValue;
			}
			if (options?.make) self.make = options.make;
			if (options?.fiberCached) cacheKeys.add(key);
			return self;
		};
		return arguments.length > 0 ? init(arguments[0], arguments[1]) : init;
	};
	var ServiceProto = {
		[ServiceTypeId]: ServiceTypeId,
		...Prototype({
			label: "Service",
			evaluate(fiber) {
				return exitSucceed(get(fiber.context, this));
			}
		}),
		toJSON() {
			return {
				_id: "Service",
				key: this.key
			};
		},
		of(self) {
			return self;
		},
		context(self) {
			return make$9(this, self);
		},
		use(f) {
			return withFiber((fiber) => f(get(fiber.context, this)));
		},
		useSync(f) {
			return withFiber((fiber) => exitSucceed(f(get(fiber.context, this))));
		}
	};
	var cacheKeys = new Set();
	var ReferenceTypeId = "~effect/Context/Reference";
	var TypeId$13 = "~effect/Context";
	var MaxDepth = 8;
	var FlattenAfterBaseHits = 8;
	var makeImpl = (cacheRoot, base, overlay, depth) => {
		const self = Object.create(Proto$5);
		self.cacheRoot = cacheRoot ?? self;
		self.base = base;
		self.overlay = overlay;
		self.depth = depth;
		self._flat = void 0;
		self.baseHits = 0;
		return self;
	};
	var applyOverlays = (map, overlay) => {
		if (!overlay) return;
		applyOverlays(map, overlay.parent);
		map.set(overlay.key, overlay.value);
	};
	var flatten = (self) => {
		if (self._flat) return self._flat;
		if (!self.overlay) return self._flat = self.base;
		const map = new Map(self.base);
		applyOverlays(map, self.overlay);
		return self._flat = map;
	};
	var notFound = Symbol();
	var lookup = (self, key) => {
		const impl = self;
		for (let overlay = impl.overlay; overlay; overlay = overlay.parent) if (overlay.key === key) return overlay.value;
		const value = impl.base.get(key);
		if (value === void 0 && !impl.base.has(key)) return notFound;
		if (impl.overlay && ++impl.baseHits >= impl.base.size && impl.baseHits >= FlattenAfterBaseHits) {
			impl.base = flatten(impl);
			impl.overlay = void 0;
			impl.depth = 0;
		}
		return value;
	};
	var makeUnsafe$2 = (mapUnsafe) => makeImpl(void 0, mapUnsafe, void 0, 0);
	var Proto$5 = {
		get mapUnsafe() {
			return flatten(this);
		},
		...PipeInspectableProto,
		[TypeId$13]: { _Services: (_) => _ },
		toJSON() {
			return {
				_id: "Context",
				services: Array.from(this.mapUnsafe).map(([key, value]) => ({
					key,
					value
				}))
			};
		},
		[symbol](that) {
			if (!isContext(that)) return false;
			const self = this.mapUnsafe;
			const other = that.mapUnsafe;
			if (self.size !== other.size) return false;
			for (const [key, value] of self) if (!other.has(key) || !equals$1(value, other.get(key))) return false;
			return true;
		},
		[symbol$1]() {
			return number$1(this.mapUnsafe.size);
		}
	};
	var hasSameCache = (self, that) => self.cacheRoot === that.cacheRoot;
	var isContext = (u) => hasProperty(u, TypeId$13);
	var isReference = (u) => !!u[ReferenceTypeId];
	var empty$1 = () => emptyContext;
	var emptyContext = makeUnsafe$2(new Map());
	var make$9 = (key, service) => makeUnsafe$2(new Map([[key.key, service]]));
	var add = dual(3, (self, key, service) => addUnsafe(self, key.key, service));
	var addUnsafe = (self, key, service) => {
		const impl = self;
		const cacheRoot = cacheKeys.has(key) ? void 0 : impl.cacheRoot;
		if (impl.depth >= MaxDepth) {
			const map = new Map(impl._flat ?? impl.base);
			if (!impl._flat) applyOverlays(map, impl.overlay);
			map.set(key, service);
			return makeImpl(cacheRoot, map, void 0, 0);
		}
		return makeImpl(cacheRoot, impl.base, {
			key,
			value: service,
			parent: impl.overlay
		}, impl.depth + 1);
	};
	var getOrUndefinedUnsafe = (self, key) => {
		const value = lookup(self, key);
		return value === notFound ? void 0 : value;
	};
	var get = dual(2, (self, service) => {
		const value = lookup(self, service.key);
		if (value === notFound) {
			if (isReference(service)) return getDefaultValue(service);
			throw serviceNotFoundError(service);
		}
		return value;
	});
	var defaultValueCacheKey = "~effect/Context/defaultValue";
	var getDefaultValue = (ref) => {
		if (defaultValueCacheKey in ref) return ref[defaultValueCacheKey];
		return ref[defaultValueCacheKey] = ref.defaultValue();
	};
	var serviceNotFoundError = (service) => {
		const error = new Error(`Service not found${service.key ? `: ${String(service.key)}` : ""}`);
		if (error.stack) {
			const lines = error.stack.split("\n");
			lines.splice(1, 3);
			error.stack = lines.join("\n");
		}
		return error;
	};
	var Reference = Service;
	var isArrayNonEmpty$1 = (self) => self.length > 0;
	var succeed$4 = succeed$5;
	var fail$4 = fail$5;
	var isFailure = isFailure$1;
	var Array$1 = globalThis.Array;
	var append = dual(2, (self, last) => [...self, last]);
	Array$1.isArray;
	var isArrayNonEmpty = isArrayNonEmpty$1;
	var empty = () => [];
	var Scheduler = Reference("effect/Scheduler", {
		fiberCached: true,
		defaultValue: () => new MixedScheduler()
	});
	var setMicrotask = (f) => {
		let cancelled = false;
		Promise.resolve().then(() => {
			if (!cancelled) f();
		});
		return () => {
			cancelled = true;
		};
	};
	var setTimer = "setImmediate" in globalThis ? (f) => {
		const timer = globalThis.setImmediate(f);
		return () => globalThis.clearImmediate(timer);
	} : (f) => {
		const timer = setTimeout(f, 0);
		return () => clearTimeout(timer);
	};
	var setImmediate = (f) => {
		try {
			return setTimer(f);
		} catch {
			return setMicrotask(f);
		}
	};
	var PriorityBuckets = class {
		buckets = [];
		scheduleTask(task, priority) {
			const buckets = this.buckets;
			const len = buckets.length;
			let bucket;
			let index = 0;
			for (; index < len; index++) {
				if (buckets[index][0] > priority) break;
				bucket = buckets[index];
			}
			if (bucket && bucket[0] === priority) bucket[1].push(task);
			else if (index === len) buckets.push([priority, [task]]);
			else buckets.splice(index, 0, [priority, [task]]);
		}
		drain() {
			const buckets = this.buckets;
			this.buckets = [];
			return buckets;
		}
	};
	var MixedScheduler = class {
		executionMode;
		setImmediate;
		constructor(executionMode = "async", setImmediateFn) {
			this.executionMode = executionMode;
			this.setImmediate = setImmediateFn ?? (executionMode === "sync" ? setMicrotask : setImmediate);
		}
		shouldYield(fiber) {
			return fiber.currentOpCount >= fiber.cache.maxOpsBeforeYield;
		}
		makeDispatcher() {
			return new MixedSchedulerDispatcher(this.setImmediate);
		}
	};
	var MixedSchedulerDispatcher = class {
		tasks = new PriorityBuckets();
		running = void 0;
		setImmediate;
		constructor(setImmediateFn = setImmediate) {
			this.setImmediate = setImmediateFn;
		}
		scheduleTask(task, priority) {
			this.tasks.scheduleTask(task, priority);
			if (this.running === void 0) this.running = this.setImmediate(this.afterScheduled);
		}
		afterScheduled = () => {
			this.running = void 0;
			this.runTasks();
		};
		runTasks() {
			const buckets = this.tasks.drain();
			for (let i = 0; i < buckets.length; i++) {
				const toRun = buckets[i][1];
				for (let j = 0; j < toRun.length; j++) toRun[j]();
			}
		}
		flush() {
			while (this.tasks.buckets.length > 0) {
				if (this.running !== void 0) {
					this.running();
					this.running = void 0;
				}
				this.runTasks();
			}
		}
	};
	var MaxOpsBeforeYield = Reference("effect/Scheduler/MaxOpsBeforeYield", {
		fiberCached: true,
		defaultValue: () => 2048
	});
	var PreventSchedulerYield = Reference("effect/Scheduler/PreventSchedulerYield", {
		fiberCached: true,
		defaultValue: () => false
	});
	var ParentSpanKey = "effect/Tracer/ParentSpan";
	var TracerKey = "effect/Tracer";
	var FiberRuntimeMetricsKey = "effect/Metric/FiberRuntimeMetrics";
	var CurrentStackFrame = Reference("effect/References/CurrentStackFrame", {
		fiberCached: true,
		defaultValue: constUndefined
	});
	var TracerEnabled = Reference("effect/References/TracerEnabled", {
		fiberCached: true,
		defaultValue: constTrue
	});
	var CurrentLogLevel = Reference("effect/References/CurrentLogLevel", {
		fiberCached: true,
		defaultValue: () => "Info"
	});
	var MinimumLogLevel = Reference("effect/References/MinimumLogLevel", {
		fiberCached: true,
		defaultValue: () => "Info"
	});
	var Interrupt = class extends ReasonBase {
		constructor(fiberId, annotations = constEmptyAnnotations) {
			super("Interrupt", annotations, "Interrupted");
			this.fiberId = fiberId;
		}
		toString() {
			return `Interrupt(${this.fiberId})`;
		}
		toJSON() {
			return {
				_tag: "Interrupt",
				fiberId: this.fiberId
			};
		}
		[symbol](that) {
			return isInterruptReason(that) && this.fiberId === that.fiberId && this.annotations === that.annotations;
		}
		[symbol$1]() {
			return string$1(`${this._tag}:${this.fiberId}`);
		}
	};
	var causeInterrupt = (fiberId) => new CauseImpl([new Interrupt(fiberId)]);
	var hasFails = (self) => self.reasons.some(isFailReason$1);
	var findError = (self) => {
		for (let i = 0; i < self.reasons.length; i++) {
			const reason = self.reasons[i];
			if (reason._tag === "Fail") return succeed$4(reason.error);
		}
		return fail$4(self);
	};
	var hasDies = (self) => self.reasons.some(isDieReason);
	var causeElectDefects = (self) => hasDies(self) && hasFails(self) ? causeFromReasons(self.reasons.map((reason) => reason._tag === "Fail" && !isDone(reason.error) ? new Die(reason.error, reason.annotations) : reason)) : self;
	var findRecoverableError = (self) => hasDies(self) ? fail$4(causeElectDefects(self)) : findError(self);
	var hasInterrupts = (self) => self.reasons.some(isInterruptReason);
	var causeMap = dual(2, (self, f) => {
		let hasFail = false;
		const failures = self.reasons.map((failure) => {
			if (isFailReason$1(failure)) {
				hasFail = true;
				return new Fail(f(failure.error), failure.annotations);
			}
			return failure;
		});
		return hasFail ? causeFromReasons(failures) : self;
	});
	var FiberTypeId = "~effect/Fiber";
	var fiberVariance = {
		_A: identity,
		_E: identity
	};
	var fiberIdStore = { id: 0 };
	var AsyncResource = (() => {
		try {
			return globalThis.process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource;
		} catch {
			return;
		}
	})();
	var captureAsyncContext = () => AsyncResource === void 0 ? void 0 : new AsyncResource("effect/Fiber");
	var getCurrentFiber = () => globalThis[currentFiberTypeId];
	var FiberImpl = class {
		constructor(context, interruptible = true) {
			this.setContext(context);
			this.id = ++fiberIdStore.id;
			this.currentOpCount = 0;
			this.interruptible = interruptible;
			this._stack = [];
			this._observers = void 0;
			this._exit = void 0;
			this._children = void 0;
			this._interruptedCause = void 0;
			this._yielded = void 0;
			this._running = false;
			this._deferredInterrupt = false;
			this._parent = void 0;
			this._asyncContext = void 0;
			this.cache.runtimeMetrics?.recordFiberStart(this.context);
		}
		get [FiberTypeId]() {
			return fiberVariance;
		}
		get currentDispatcher() {
			return this._dispatcher ??= this.cache.scheduler.makeDispatcher();
		}
		getRef(ref) {
			return get(this.context, ref);
		}
		addObserver(cb) {
			if (this._exit) {
				cb(this._exit);
				return constVoid;
			}
			if (this._observers === void 0) this._observers = [cb];
			else this._observers.push(cb);
			return () => this.removeObserver(cb);
		}
		removeObserver(cb) {
			if (this._exit || this._observers === void 0) return;
			const index = this._observers.indexOf(cb);
			if (index >= 0) this._observers.splice(index, 1);
		}
		interruptUnsafe(fiberId, annotations) {
			if (this._exit) return;
			let cause = causeInterrupt(fiberId);
			if (this.cache.stackFrame) cause = causeAnnotate(cause, make$9(StackTraceKey, this.cache.stackFrame));
			if (annotations) cause = causeAnnotate(cause, annotations);
			this._interruptedCause = this._interruptedCause ? causeAddInterrupts(this._interruptedCause, cause) : cause;
			if (this.interruptible) {
				if (this._running) this._deferredInterrupt = true;
				else this.evaluate(failCause$1(this._interruptedCause));
			}
		}
		pollUnsafe() {
			return this._exit;
		}
		evaluate(effect) {
			if (this._exit) return;
			else if (this._asyncContext !== void 0) {
				const asyncContext = this._asyncContext;
				this._asyncContext = void 0;
				try {
					return asyncContext.runInAsyncScope(this.evaluate, this, effect);
				} finally {
					asyncContext.emitDestroy();
				}
			} else if (this._yielded !== void 0) {
				const yielded = this._yielded;
				this._yielded = void 0;
				yielded();
			}
			const exit = this.runLoop(effect);
			if (exit === Yield) {
				this._asyncContext = captureAsyncContext();
				return;
			}
			const interruptChildren = fiberMiddleware.interruptChildren && fiberMiddleware.interruptChildren(this);
			if (interruptChildren !== void 0) return this.evaluate(flatMap$1(interruptChildren, () => exit));
			this._exit = exit;
			this.cache.runtimeMetrics?.recordFiberEnd(this.context, this._exit);
			if (this._parent) {
				this._parent._children?.delete(this);
				this._parent = void 0;
			}
			if (this._observers !== void 0) {
				const observers = this._observers;
				this._observers = void 0;
				for (let i = 0; i < observers.length; i++) observers[i](exit);
			}
			this._stack.length = 0;
			this._children = void 0;
			this.context = empty$1();
		}
		runLoop(effect) {
			const prevFiber = globalThis[currentFiberTypeId];
			globalThis[currentFiberTypeId] = this;
			const prevRunning = this._running;
			this._running = true;
			let yielding = false;
			let current = effect;
			this.currentOpCount = 0;
			try {
				while (true) try {
					if (this._deferredInterrupt) {
						this._deferredInterrupt = false;
						current = failCause$1(this._interruptedCause);
					}
					this.currentOpCount++;
					const cache = this.cache;
					if (!yielding && !cache.preventYield && cache.scheduler.shouldYield(this)) {
						yielding = true;
						const prev = current;
						current = flatMap$1(yieldNow, () => prev);
					}
					current = cache.tracerContext ? cache.tracerContext(current, this) : current[evaluate](this);
					if (current === Yield) {
						const yielded = this._yielded;
						if ("~effect/Exit" in yielded) {
							this._deferredInterrupt = false;
							this._yielded = void 0;
							return yielded;
						} else if (this._deferredInterrupt) {
							this._yielded = void 0;
							yielded();
							continue;
						}
						return Yield;
					}
				} catch (error) {
					if (!hasProperty(current, "~effect/Effect/evaluate")) return exitDie(`Fiber.runLoop: Not a valid effect: ${String(current)}`);
					current = exitDie(error);
				}
			} finally {
				this._running = prevRunning;
				globalThis[currentFiberTypeId] = prevFiber;
			}
		}
		getCont(symbol) {
			if (this._deferredInterrupt) {
				this._deferredInterrupt = false;
				return deferredInterruptCont;
			}
			while (true) {
				const op = this._stack.pop();
				if (!op) return void 0;
				const all = op[contAll];
				if (all !== void 0) {
					const cont = all.call(op, this);
					if (cont) {
						cont[symbol] = cont;
						return cont;
					}
				}
				if (op[symbol]) return op;
			}
		}
		succeedWith(value) {
			if ((++this.currentOpCount & maxInlineSteps - 1) === 0) return exitSucceed(value);
			const cont = this.getCont(contA);
			return cont ? cont[contA](value, this) : this.yieldWith(exitSucceed(value));
		}
		yieldWith(value) {
			this._yielded = value;
			return Yield;
		}
		children() {
			return this._children ??= new Set();
		}
		pipe() {
			return pipeArguments(this, arguments);
		}
		setContext(context) {
			const previous = this.context;
			this.context = context;
			if (previous !== void 0 && hasSameCache(previous, context)) return;
			const root = context.cacheRoot;
			const cache = root._fiberCache ??= makeFiberContextCache(context);
			if (this.cache?.scheduler !== cache.scheduler) this._dispatcher = void 0;
			this.cache = cache;
		}
		get currentSpanLocal() {
			const span = this.cache.span;
			return span?._tag === "Span" ? span : void 0;
		}
	};
	var makeFiberContextCache = (context) => {
		const currentTracer = getOrUndefinedUnsafe(context, TracerKey);
		return {
			scheduler: get(context, Scheduler),
			tracer: currentTracer,
			tracerContext: currentTracer ? currentTracer["context"] : void 0,
			tracerEnabled: get(context, TracerEnabled),
			span: getOrUndefinedUnsafe(context, ParentSpanKey),
			logLevel: get(context, CurrentLogLevel),
			minimumLogLevel: get(context, MinimumLogLevel),
			stackFrame: get(context, CurrentStackFrame),
			runtimeMetrics: getOrUndefinedUnsafe(context, FiberRuntimeMetricsKey),
			maxOpsBeforeYield: get(context, MaxOpsBeforeYield),
			preventYield: get(context, PreventSchedulerYield)
		};
	};
	var deferredInterruptCont = {
		[contA](_value, fiber) {
			return failCause$1(fiber._interruptedCause);
		},
		[contE](_cause, fiber) {
			return failCause$1(fiber._interruptedCause);
		}
	};
	var maxInlineSteps = 32;
	var fiberMiddleware = { interruptChildren: void 0 };
	var fiberStackAnnotations = (fiber) => {
		if (!fiber.cache.stackFrame) return void 0;
		const annotations = new Map();
		annotations.set(InterruptorStackTrace.key, fiber.cache.stackFrame);
		return makeUnsafe$2(annotations);
	};
	var fiberAwaitAll = (self) => callback((resume) => {
		const iter = self[Symbol.iterator]();
		const exits = [];
		let cancel = void 0;
		function loop() {
			let result = iter.next();
			while (!result.done) {
				if (result.value._exit) {
					exits.push(result.value._exit);
					result = iter.next();
					continue;
				}
				cancel = result.value.addObserver((exit) => {
					exits.push(exit);
					loop();
				});
				return;
			}
			resume(succeed$3(exits));
		}
		loop();
		return sync(() => cancel?.());
	});
	var fiberInterruptAll = (fibers) => withFiber((parent) => {
		const annotations = fiberStackAnnotations(parent);
		let fiberArr = empty();
		for (const fiber of fibers) {
			fiber.interruptUnsafe(parent.id, annotations);
			fiberArr.push(fiber);
		}
		return asVoid$1(fiberAwaitAll(fiberArr));
	});
	var succeed$3 = exitSucceed;
	var failCause$1 = exitFailCause;
	var fail$3 = exitFail;
	var sync = makePrimitive({
		op: "Sync",
		[evaluate](fiber) {
			const thunk = this[args];
			const value = thunk();
			const cont = fiber.getCont(contA);
			return cont ? cont[contA](value, fiber) : fiber.yieldWith(exitSucceed(value));
		}
	});
	var suspend$1 = makePrimitive({
		op: "Suspend",
		[evaluate](_fiber) {
			const thunk = this[args];
			return thunk();
		}
	});
	var yieldNow = makePrimitive({
		op: "Yield",
		[evaluate](fiber) {
			let resumed = false;
			fiber.currentDispatcher.scheduleTask(() => {
				if (resumed) return;
				fiber.evaluate(exitVoid);
			}, this["~effect/Effect/args"] ?? 0);
			return fiber.yieldWith(() => {
				resumed = true;
			});
		}
	})(0);
	var failCauseSync$1 = (evaluate) => suspend$1(() => failCause$1(evaluate()));
	var die$2 = (defect) => exitDie(defect);
	var void_$2 = succeed$3(void 0);
	var try_$1 = (options) => {
		const evaluate = typeof options === "function" ? options : options.try;
		const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.try") : options.catch;
		return suspend$1(() => {
			try {
				return succeed$3(evaluate());
			} catch (err) {
				return fail$3(catcher(err));
			}
		});
	};
	var promise$1 = (evaluate) => callbackOptions(function(resume, signal) {
		evaluate(signal).then((a) => resume(succeed$3(a)), (e) => resume(die$2(e)));
	}, evaluate.length !== 0);
	var tryPromise$1 = (options) => {
		const f = typeof options === "function" ? options : options.try;
		const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.tryPromise") : options.catch;
		return callbackOptions(function(resume, signal) {
			const failWithCatch = (cause) => suspend$1(() => {
				try {
					return fail$3(internalCall(() => catcher(cause)));
				} catch (err) {
					return die$2(err);
				}
			});
			try {
				f(signal).then((a) => resume(succeed$3(a)), (e) => resume(failWithCatch(e)));
			} catch (err) {
				resume(failWithCatch(err));
			}
		}, f.length !== 0);
	};
	var callbackOptions = function() {
		const Proto = makePrimitiveProto({
			op: "Async",
			[evaluate](fiber) {
				let resumed = false;
				let yielded = false;
				const controller = this.withSignal ? new AbortController() : void 0;
				const onCancel = this.register.call(fiber.cache.scheduler, (effect) => {
					if (resumed) return;
					resumed = true;
					if (yielded) fiber.evaluate(effect);
					else yielded = effect;
				}, controller?.signal);
				if (yielded !== false) return yielded;
				yielded = true;
				fiber.yieldWith(() => {
					resumed = true;
				});
				if (controller === void 0 && onCancel === void 0) return Yield;
				fiber._stack.push(asyncFinalizer(() => {
					resumed = true;
					controller?.abort();
					return onCancel ?? exitVoid;
				}));
				return Yield;
			}
		});
		const AsyncImpl = function(register, withSignal) {
			this.register = register;
			this.withSignal = withSignal;
		};
		AsyncImpl.prototype = Proto;
		return function(register, withSignal) {
			return new AsyncImpl(register, withSignal);
		};
	}();
	var asyncFinalizer = makePrimitive({
		op: "AsyncFinalizer",
		[contAll](fiber) {
			if (fiber.interruptible) {
				fiber.interruptible = false;
				fiber._stack.push(setInterruptibleTrue);
			}
		},
		[contE](cause, _fiber) {
			return hasInterrupts(cause) ? flatMap$1(combineFinalizerCause(exitFailCause(cause), this[args]()), () => failCause$1(cause)) : failCause$1(cause);
		}
	});
	var callback = (register) => callbackOptions(register, register.length >= 2);
	var gen$1 = (...args) => {
		if (args.length === 1) {
			const body = args[0];
			return suspend$1(() => fromIteratorUnsafe(body()));
		}
		const [options, body] = args;
		return suspend$1(() => fromIteratorUnsafe(body.call(options.self)));
	};
	var defineFunctionLength = (length, fn) => Object.defineProperty(fn, "length", {
		value: length,
		configurable: true
	});
	var fnUntracedEager$1 = (body, ...pipeables) => defineFunctionLength(body.length, pipeables.length === 0 ? function() {
		return fromIteratorEagerUnsafe(() => body.apply(this, arguments));
	} : function() {
		let effect = fromIteratorEagerUnsafe(() => body.apply(this, arguments));
		for (const pipeable of pipeables) effect = pipeable(effect, ...arguments);
		return effect;
	});
	var fromIteratorEagerUnsafe = (evaluate) => {
		try {
			const iterator = evaluate();
			let value = void 0;
			while (true) {
				const state = iterator.next(value);
				if (state.done) return succeed$3(state.value);
				const primitive = state.value;
				if (primitive && primitive._tag === "Success") {
					value = primitive.value;
					continue;
				} else if (primitive && primitive._tag === "Failure") return state.value;
				else {
					let isFirstExecution = true;
					return suspend$1(() => {
						if (isFirstExecution) {
							isFirstExecution = false;
							return flatMap$1(state.value, (value) => fromIteratorUnsafe(iterator, value));
						} else return suspend$1(() => fromIteratorUnsafe(evaluate()));
					});
				}
			}
		} catch (error) {
			return die$2(error);
		}
	};
	var fromIteratorUnsafe = function() {
		const Proto = makePrimitiveProto({
			op: "Iterator",
			[contA](value, fiber) {
				const iter = this.iterator;
				while (true) {
					const state = iter.next(value);
					if (state.done) return succeed$3(state.value);
					if (!effectIsExit(state.value)) {
						fiber._stack.push(this);
						return state.value;
					} else if (state.value._tag === "Failure") return state.value;
					value = state.value.value;
				}
			},
			[evaluate](fiber) {
				return this[contA](this.initial, fiber);
			}
		});
		const IteratorImpl = function(iterator, initial) {
			this.iterator = iterator;
			this.initial = initial;
		};
		IteratorImpl.prototype = Proto;
		return function(iterator, initial) {
			return new IteratorImpl(iterator, initial);
		};
	}();
	var evaluateCont = function(fiber) {
		fiber._stack.push(this);
		return this[args];
	};
	var OnSuccessProto = makePrimitiveProto({
		op: "OnSuccess",
		[evaluate]: evaluateCont
	});
	var ContImpl = function(self, cont, payload) {
		this[args] = self;
		this[contA] = cont;
		this.payload = payload;
	};
	ContImpl.prototype = OnSuccessProto;
	var returnPayload = function() {
		return this.payload;
	};
	var continuationMarksStack = (() => {
		const limit = getStackTraceLimit();
		if (limit === 0) return false;
		const marker = "~effect/Effect/stackProbe";
		const probe = { [marker]: function stackProbe() {
			return new Error();
		} };
		setStackTraceLimit(1);
		const error = probe[marker]();
		setStackTraceLimit(limit);
		return error.stack?.includes("[as " + marker + "]") === true;
	})();
	var mapCont = function(value, fiber) {
		const f = this.payload;
		return fiber.succeedWith(continuationMarksStack ? f(value) : internalCall(() => f(value)));
	};
	var andThenCont = function(value) {
		const f = this.payload;
		return f(value);
	};
	var asVoid$1 = (self) => new ContImpl(self, returnPayload, exitVoid);
	var flatMap$1 = dual(2, (self, f) => new ContImpl(self, andThenCont, f));
	var effectIsExit = (effect) => effect[ExitTypeId] !== void 0;
	var flatMapEager$1 = dual(2, (self, f) => {
		if (effectIsExit(self)) return self._tag === "Success" ? f(self.value) : self;
		return flatMap$1(self, f);
	});
	var map$1 = dual(2, (self, f) => new ContImpl(self, mapCont, f));
	var mapEager$1 = dual(2, (self, f) => effectIsExit(self) ? exitMap(self, f) : map$1(self, f));
	var exitIsSuccess = (self) => self._tag === "Success";
	var exitVoid = exitSucceed(void 0);
	var exitMap = dual(2, (self, f) => self._tag === "Success" ? exitSucceed(f(self.value)) : self);
	var catchCause$1 = dual(2, (self, f) => new OnFailureImpl(self, f.length !== 1 ? (cause) => f(cause) : f));
	var OnFailureProto = makePrimitiveProto({
		op: "OnFailure",
		[evaluate]: evaluateCont
	});
	var OnFailureImpl = function(self, f) {
		this[args] = self;
		this[contE] = f;
	};
	OnFailureImpl.prototype = OnFailureProto;
	var OnSuccessAndFailureProto = makePrimitiveProto({
		op: "OnSuccessAndFailure",
		[evaluate]: evaluateCont
	});
	var OnSuccessAndFailureImpl = function(self, onSuccess, onFailure) {
		this[args] = self;
		this[contA] = onSuccess;
		this[contE] = onFailure;
	};
	OnSuccessAndFailureImpl.prototype = OnSuccessAndFailureProto;
	var matchSuccess = function(value, fiber) {
		const handlers = this.payload;
		return fiber.succeedWith(continuationMarksStack ? handlers.onSuccess(value) : internalCall(() => handlers.onSuccess(value)));
	};
	var makeMatch = (op, onFailure) => {
		const Proto = makePrimitiveProto({
			op,
			[evaluate]: evaluateCont,
			[contA]: matchSuccess,
			[contE]: onFailure
		});
		const MatchImpl = function(self, handlers) {
			this[args] = self;
			this.payload = handlers;
		};
		MatchImpl.prototype = Proto;
		return MatchImpl;
	};
	var MatchImpl = makeMatch("Match", function(cause, fiber) {
		const error = findRecoverableError(cause);
		if (isFailure(error)) return failCause$1(error.failure);
		const handlers = this.payload;
		return fiber.succeedWith(continuationMarksStack ? handlers.onFailure(error.success) : internalCall(() => handlers.onFailure(error.success)));
	});
	var match$1 = dual(2, (self, options) => new MatchImpl(self, options));
	var exit$1 = (self) => effectIsExit(self) ? exitSucceed(self) : exitPrimitive(self);
	var exitPrimitive = makePrimitive({
		op: "Exit",
		[evaluate](fiber) {
			fiber._stack.push(this);
			return this[args];
		},
		[contA](value, fiber, exit) {
			return fiber.succeedWith(exit ?? exitSucceed(value));
		},
		[contE](cause, fiber, exit) {
			return fiber.succeedWith(exit ?? exitFailCause(cause));
		}
	});
	var combineFinalizerCause = (exit_, finalizer) => exitIsSuccess(exit_) ? finalizer : catchCause$1(finalizer, (cause) => failCause$1(causeElectDefects(causeCombine(exit_.cause, cause))));
	var uninterruptible = (self) => withFiber((fiber) => {
		if (!fiber.interruptible) return self;
		fiber.interruptible = false;
		fiber._stack.push(setInterruptibleTrue);
		return self;
	});
	var setInterruptibleTrue = makePrimitive({
		op: "SetInterruptible",
		[contAll](fiber) {
			fiber.interruptible = this[args];
			if (fiber._interruptedCause && fiber.interruptible) return () => failCause$1(fiber._interruptedCause);
		}
	})(true);
	var resolveConcurrency = (concurrency) => concurrency === "unbounded" ? Number.POSITIVE_INFINITY : Math.max(1, concurrency ?? 1);
	var iterateEager = () => (options) => {
		const onItem = options.onItem;
		const step = options.step;
		const resumeSequential = (state, items, index, end, effect) => flatMap$1(exit$1(effect), (itemExit) => step(state, items[index], itemExit, index) ?? runSequential(state, items, index + 1, end) ?? void_$2);
		const runSequential = (state, items, index = 0, end = items.length) => {
			for (; index < end; index++) {
				const item = items[index];
				const effect = onItem(state, item, index);
				if (!effectIsExit(effect)) return resumeSequential(state, items, index, end, effect);
				const terminal = step(state, item, effect, index);
				if (terminal) return terminal._tag === "Failure" ? terminal : void 0;
			}
		};
		return runSequential;
	};
	var iterateConcurrentImpl = (options) => {
		const onItem = options.onItem;
		const step = options.step;
		return (state, items, opts) => {
			let index = 0;
			const end = opts.end ?? items.length;
			const concurrency = opts.concurrency;
			let done = false;
			let parentFiber;
			let fibers;
			let resume;
			let terminal;
			let effect;
			const failDefect = (error) => {
				const defect = exitDie(error);
				terminal = defect;
				done = true;
				return fibers && fibers.size > 0 ? flatMap$1(uninterruptible(fiberInterruptAll(Array.from(fibers))), () => terminal ?? defect) : defect;
			};
			const go = () => {
				let paused = false;
				for (; !terminal && index < end; index++) {
					const item = items[index];
					const eff = effect ?? onItem(state, item, index);
					if (effectIsExit(eff)) {
						terminal = step(state, item, eff, index);
						if (terminal) break;
					} else if (!parentFiber) return callback((cb) => {
						parentFiber = getCurrentFiber();
						fibers = new Set();
						effect = eff;
						resume = cb;
						let result;
						try {
							result = go();
						} catch (error) {
							return cb(failDefect(error));
						}
						if (result) return cb(result);
						return suspend$1(() => {
							terminal ??= exitVoid;
							return flatMap$1(fibers ? fiberInterruptAll(fibers) : void_$2, () => terminal?._tag === "Failure" ? terminal : void_$2);
						});
					});
					else {
						effect = void 0;
						const fiber = forkUnsafe(parentFiber, eff, true, true, "inherit");
						if (fiber._exit) {
							terminal = step(state, item, fiber._exit, index);
							if (terminal) break;
							continue;
						}
						fibers.add(fiber);
						const currentIndex = index;
						fiber.addObserver((exit) => {
							fibers.delete(fiber);
							try {
								if (terminal) {
									if (exit._tag === "Failure") {
										const reasons = exit.cause.reasons.filter((reason) => reason._tag !== "Interrupt");
										if (reasons.length > 0) {
											const cause = causeFromReasons(reasons);
											terminal = exitFailCause(terminal._tag === "Failure" ? causeElectDefects(causeCombine(terminal.cause, cause)) : cause);
										}
									}
								} else {
									const result = step(state, item, exit, currentIndex);
									if (result) {
										terminal = result;
										go();
									}
								}
								if (paused) {
									const eff = go();
									if (eff) resume(eff);
								} else if (done && fibers.size === 0) resume(terminal ?? void_$2);
							} catch (error) {
								resume(failDefect(error));
							}
						});
						if (fibers.size < concurrency) continue;
						paused = true;
						index++;
						return;
					}
				}
				done = true;
				if (terminal) {
					if (fibers && fibers.size > 0) {
						const annotations = fiberStackAnnotations(parentFiber);
						fibers.forEach((f) => f.interruptUnsafe(parentFiber.id, annotations));
						return;
					}
					if (resume || terminal._tag === "Failure") return terminal;
				} else if (resume) {
					if (!fibers) return exitVoid;
					else if (fibers.size === 0) resume(void_$2);
				}
			};
			return go();
		};
	};
	var iterateConcurrent = () => (options) => iterateConcurrentImpl(options);
	var forkUnsafe = (parent, effect, immediate = false, daemon = false, uninterruptible = false) => {
		const parentRuntime = parent;
		const interruptible = uninterruptible === "inherit" ? parentRuntime.interruptible : !uninterruptible;
		const child = new FiberImpl(parentRuntime.context, interruptible);
		if (!daemon) {
			parentRuntime.children().add(child);
			child._parent = parentRuntime;
		}
		if (immediate) child.evaluate(effect);
		else {
			child._asyncContext = captureAsyncContext();
			parentRuntime.currentDispatcher.scheduleTask(() => child.evaluate(effect), 0);
		}
		return child;
	};
	var runForkWith = (context) => (effect, options) => {
		const fiber = new FiberImpl(options?.scheduler ? add(context, Scheduler, options.scheduler) : context, options?.uninterruptible !== true);
		fiber.evaluate(effect);
		if (fiber._exit) return fiber;
		if (options?.signal) {
			if (options.signal.aborted) fiber.interruptUnsafe();
			else {
				const abort = () => fiber.interruptUnsafe();
				options.signal.addEventListener("abort", abort, { once: true });
				fiber.addObserver(() => options.signal.removeEventListener("abort", abort));
			}
		}
		if (options?.onFiberStart) options.onFiberStart(fiber);
		return fiber;
	};
	var runFork$1 = runForkWith(empty$1());
	var runSyncExitWith = (context) => {
		const runFork = runForkWith(context);
		return (effect) => {
			if (effectIsExit(effect)) return effect;
			const scheduler = new MixedScheduler("sync");
			const fiber = runFork(effect, { scheduler });
			fiber._dispatcher?.flush();
			return fiber._exit ?? exitDie(new AsyncFiberError(fiber));
		};
	};
	var runSyncExit$1 = runSyncExitWith(empty$1());
	var AsyncFiberErrorTypeId = "~effect/Cause/AsyncFiberError";
	var AsyncFiberError = class extends TaggedError$1("AsyncFiberError") {
		[AsyncFiberErrorTypeId] = AsyncFiberErrorTypeId;
		constructor(fiber) {
			super({
				message: "An asynchronous Effect was executed with Effect.runSync",
				fiber
			});
		}
	};
	var UnknownErrorTypeId = "~effect/Cause/UnknownError";
	var UnknownError = class extends TaggedError$1("UnknownError") {
		[UnknownErrorTypeId] = UnknownErrorTypeId;
		constructor(cause, message) {
			super({
				message,
				cause
			});
		}
	};
	var colors = {
		bold: "1",
		red: "31",
		green: "32",
		yellow: "33",
		blue: "34",
		cyan: "36",
		white: "37",
		gray: "90",
		black: "30",
		bgBrightRed: "101"
	};
	colors.gray, colors.blue, colors.green, colors.yellow, colors.red, colors.bgBrightRed, colors.black;
	var isFailReason = isFailReason$1;
	var die$1 = causeDie;
	var map = causeMap;
	var succeed$2 = exitSucceed;
	var failCause = exitFailCause;
	var fail$2 = exitFail;
	var void_$1 = exitVoid;
	var isSuccess = exitIsSuccess;
	var TypeId$11 = "~effect/DateTime";
	var TimeZoneTypeId = "~effect/DateTime/TimeZone";
	var Proto$4 = {
		[TypeId$11]: TypeId$11,
		pipe() {
			return pipeArguments(this, arguments);
		},
		[NodeInspectSymbol]() {
			return this.toString();
		},
		toJSON() {
			return toDateUtc$1(this).toJSON();
		}
	};
	({ ...Proto$4 });
	({ ...Proto$4 });
	var ProtoTimeZone = {
		[TimeZoneTypeId]: TimeZoneTypeId,
		[NodeInspectSymbol]() {
			return this.toString();
		}
	};
	({ ...ProtoTimeZone });
	({ ...ProtoTimeZone });
	var toDateUtc$1 = (self) => new Date(self.epochMilliseconds);
	globalThis.String;
	var trim = (self) => self.trim();
	var promise = promise$1;
	var tryPromise = tryPromise$1;
	var succeed$1 = succeed$3;
	var void_ = void_$2;
	var gen = gen$1;
	var fail$1 = fail$3;
	var failCauseSync = failCauseSync$1;
	var die = die$2;
	var try_ = try_$1;
	var flatMap = flatMap$1;
	var exit = exit$1;
	var asVoid = asVoid$1;
	var catchCause = catchCause$1;
	var match = match$1;
	var runFork = runFork$1;
	var runSyncExit = runSyncExit$1;
	var mapEager = mapEager$1;
	var flatMapEager = flatMapEager$1;
	var fnUntracedEager = fnUntracedEager$1;
	var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var codes = new Uint8Array(123).fill(255);
	for (let i = 0; i < 64; i++) codes[alphabet.charCodeAt(i)] = i;
	codes["=".charCodeAt(0)] = 0;
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...PipeInspectableProto });
	BaseProto.toString, BaseProto[NodeInspectSymbol];
	({ ...PipeInspectableProto });
	var CONSTRUCTOR_ANNOTATION_KEY = "~constructor";
	var missing = Symbol();
	var succeed = succeed$2;
	var missingExit = succeed(missing);
	var sameExit = succeed(missing);
	var toOption = (value) => value === missing ? none() : some(value);
	var fromOptionExit = (option) => option._tag === "None" ? missingExit : succeed(option.value);
	var TypeId$5 = "~effect/SchemaIssue/Issue";
	function isIssue(u) {
		return hasProperty(u, TypeId$5) && u[TypeId$5] === TypeId$5;
	}
	var IssueNodeImpl = class {
		[TypeId$5] = TypeId$5;
		constructor(input, options) {
			if (options?.reportInput === true && input !== missing) this.input = input;
		}
	};
	var Filter$1 = class extends IssueNodeImpl {
		_tag = "Filter";
		filter;
		issue;
		constructor(filter, issue, input, options) {
			super(input, options);
			this.filter = filter;
			this.issue = issue;
		}
	};
	var Encoding = class extends IssueNodeImpl {
		_tag = "Encoding";
		ast;
		issue;
		constructor(ast, issue, input, options) {
			super(input, options);
			this.ast = ast;
			this.issue = issue;
		}
	};
	var Pointer = class extends IssueNodeImpl {
		_tag = "Pointer";
		path;
		issue;
		constructor(path, issue) {
			super();
			this.path = path;
			this.issue = issue;
		}
	};
	var MissingKey = class extends IssueNodeImpl {
		_tag = "MissingKey";
		annotations;
		constructor(annotations) {
			super();
			this.annotations = annotations;
		}
	};
	var UnexpectedKey = class extends IssueNodeImpl {
		_tag = "UnexpectedKey";
		ast;
		constructor(ast, input, options) {
			super(input, options);
			this.ast = ast;
		}
	};
	var Composite = class extends IssueNodeImpl {
		_tag = "Composite";
		ast;
		issues;
		constructor(ast, issues, input, options) {
			super(input, options);
			this.ast = ast;
			this.issues = issues;
		}
	};
	var InvalidType = class extends IssueNodeImpl {
		_tag = "InvalidType";
		ast;
		constructor(ast, input, options) {
			super(input, options);
			this.ast = ast;
		}
	};
	var InvalidValue = class extends IssueNodeImpl {
		_tag = "InvalidValue";
		annotations;
		constructor(annotations, input, options) {
			super(input, options);
			this.annotations = annotations;
		}
	};
	function getSchemaIssue(cause) {
		let issue;
		for (const reason of cause.reasons) {
			if (!isFailReason(reason) || !isIssue(reason.error)) return;
			issue ??= reason.error;
		}
		return issue;
	}
	function getSchemaIssueOrThrow(cause, message) {
		const issue = getSchemaIssue(cause);
		if (issue === void 0) throw new Error(message, { cause });
		return issue;
	}
	var makeGetter = (fields) => Object.assign(Object.create(Prototype$1), fields);
	var passthrough_$1 = makeGetter({ _tag: "Passthrough" });
	function passthrough$1() {
		return passthrough_$1;
	}
	function transformEffect$1(f) {
		return makeGetter({
			_tag: "TransformEffect",
			transform: f
		});
	}
	function parseJson(options) {
		return transformEffect$1((input, parseOptions) => try_({
			try: () => JSON.parse(input, options?.reviver),
			catch: () => new InvalidValue({ expected: "a valid JSON string" }, input, parseOptions)
		}));
	}
	function stringifyJson(options) {
		return transformEffect$1((input, parseOptions) => try_({
			try: () => {
				const output = JSON.stringify(input, options?.replacer, options?.space);
				if (output === void 0) throw new TypeError("Value cannot be represented as JSON");
				return output;
			},
			catch: () => new InvalidValue({ expected: "a JSON-serializable value" }, input, parseOptions)
		}));
	}
	var ContentTypeId = Symbol.for("~effect/Schema/content");
	function setContent(operation, content) {
		Object.defineProperty(operation, ContentTypeId, { value: content });
		return operation;
	}
	var TypeId$4 = "~effect/SchemaTransformation/Transformation";
	var Transformation = class extends Class$1 {
		[TypeId$4] = TypeId$4;
		_tag = "Transformation";
		decode;
		encode;
		constructor(decode, encode) {
			super();
			this.decode = decode;
			this.encode = encode;
		}
		flip() {
			return new Transformation(this.encode, this.decode);
		}
	};
	function isTransformation(u) {
		return hasProperty(u, TypeId$4) && u[TypeId$4] === TypeId$4;
	}
	var makeTransformation = (options) => {
		if (isTransformation(options)) return options;
		return new Transformation(options.decode, options.encode);
	};
	var passthrough_ = new Transformation(passthrough$1(), passthrough$1());
	function passthrough() {
		return passthrough_;
	}
	function fromJsonString$1(options) {
		return new Transformation(parseJson(options ?? {}), setContent(stringifyJson(options), {
			mediaType: "application/json",
			preserveSchema: options?.reviver === void 0 && options?.replacer === void 0
		}));
	}
	function makeGuard(tag) {
		return (ast) => ast._tag === tag;
	}
	var isDeclaration = makeGuard("Declaration");
	var isArrays = makeGuard("Arrays");
	var isObjects = makeGuard("Objects");
	var isSuspend = makeGuard("Suspend");
	var Link = class {
		to;
		transformation;
		constructor(to, transformation) {
			this.to = to;
			this.transformation = transformation;
		}
	};
	var defaultParseOptions = {};
	var Context = class {
		isOptional;
		isMutable;
		constructorDefault;
		annotations;
		constructor(isOptional, isMutable, constructorDefault = void 0, annotations = void 0) {
			this.isOptional = isOptional;
			this.isMutable = isMutable;
			this.constructorDefault = constructorDefault;
			this.annotations = annotations;
		}
	};
	var TypeId$3 = "~effect/Schema";
	var ASTNodeImpl = class {
		[TypeId$3] = TypeId$3;
		annotations;
		checks;
		encoding;
		context;
		constructor(annotations = void 0, checks = void 0, encoding = void 0, context = void 0) {
			this.annotations = annotations;
			this.checks = checks;
			this.encoding = encoding;
			this.context = context;
		}
		toString() {
			return `<${this._tag}>`;
		}
	};
	var String$2 = class extends ASTNodeImpl {
		_tag = "String";
		getParser() {
			return fromRefinement(this, isString$1);
		}
		matchPart(s, options) {
			const checks = this.checks;
			return checks && !options.disableChecks && collectIssues(checks, s, void 0, this, options) ? void 0 : s;
		}
		getExpected() {
			return "string";
		}
	};
	var string = new String$2();
	var wrapPropertyKeyIssue = (s, ast, key, exit) => {
		if (exit.cause.reasons.length === 0) return exit;
		const issue = getSchemaIssue(exit.cause);
		if (issue === void 0) return failCause(map(exit.cause, (issue) => new Composite(ast, [new Pointer([key], issue)], s.input, s.options)));
		const pointer = new Pointer([key], issue);
		if (s.options.errors === "all") {
			if (s.issues) s.issues.push(pointer);
			else s.issues = [pointer];
		} else return fail$2(new Composite(ast, [pointer], s.input, s.options));
	};
	var FINITE_PATTERN = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:[Ee][+-]?\\d+)?";
	function getIndexSignatureKeys(input, parameter, options = defaultParseOptions) {
		let stringKeys;
		let symbolKeys;
		function go(parameter) {
			switch (parameter._tag) {
				case "String":
				case "TemplateLiteral": return (stringKeys ??= Object.keys(input)).filter((k) => parameter.matchPart(k, options) !== void 0);
				case "Number": return (stringKeys ??= Object.keys(input)).filter((k) => parameter.matchKey(k, options) !== void 0);
				case "Symbol": return (symbolKeys ??= Object.getOwnPropertySymbols(input)).filter((k) => Object.prototype.propertyIsEnumerable.call(input, k) && parameter.matchKey(k, options) !== void 0);
				case "Union": return [...new Set(parameter.types.flatMap(go))];
				default: return [];
			}
		}
		return go(parameterFromPropertyKey(toEncoded(parameter)));
	}
	var PropertySignature = class {
		name;
		type;
		constructor(name, type) {
			this.name = name;
			this.type = type;
		}
	};
	function isIndexSignatureParameterSide(ast) {
		switch (ast._tag) {
			case "String":
			case "Number":
			case "Symbol":
			case "TemplateLiteral": return true;
			case "Union": return ast.types.every(isIndexSignatureParameterSide);
			default: return false;
		}
	}
	function isIndexSignatureParameterEncodedSide(ast) {
		const encoded = getLastEncoding(ast);
		switch (encoded._tag) {
			case "String":
			case "Number":
			case "Symbol":
			case "TemplateLiteral": return true;
			case "Union": return encoded.types.every(isIndexSignatureParameterEncodedSide);
			default: return false;
		}
	}
	function isIndexSignatureParameter(ast) {
		return isIndexSignatureParameterSide(ast) && isIndexSignatureParameterEncodedSide(ast);
	}
	var IndexSignature = class {
		parameter;
		type;
		constructor(parameter, type) {
			if (!isIndexSignatureParameter(parameter)) throw new Error(`Invalid index signature parameter ${parameter._tag}`);
			this.parameter = parameter;
			this.type = type;
			if (isOptional(type) || type.encoding !== void 0 && isOptional(toEncoded(type))) throw new Error("Cannot use `Schema.optionalKey` or `Schema.optional` with index signatures. Index signatures already allow keys to be absent; use `Schema.UndefinedOr` to allow `undefined` values.");
		}
	};
	var Objects = class extends ASTNodeImpl {
		_tag = "Objects";
		propertySignatures;
		indexSignatures;
		encodingChecks;
		constructor(propertySignatures, indexSignatures, annotations, checks, encoding, context, encodingChecks) {
			super(annotations, checks, encoding, context);
			this.propertySignatures = propertySignatures;
			this.indexSignatures = indexSignatures;
			this.encodingChecks = encodingChecks;
		}
		getParser(compile, compileField = compile) {
			const ast = this;
			const hasProperties = ast.propertySignatures.length;
			const indexCount = ast.indexSignatures.length;
			if (!hasProperties && !indexCount) return fromRefinement(ast, isNotNullish);
			let properties;
			let indexes;
			const compileMembers = () => {
				if (!properties) {
					properties = ast.propertySignatures.map((ps) => ({
						parser: compileField(ps.type),
						name: ps.name,
						type: ps.type
					}));
					indexes = indexCount ? ast.indexSignatures.map((is) => ({
						is,
						parserKey: compile(parameterFromPropertyKey(is.parameter)),
						parserValue: compileField(is.type)
					})) : void 0;
				}
				return properties;
			};
			const makeFallback = () => {
				const expectedKeys = new Set(ast.propertySignatures.map((ps) => typeof ps.name === "number" ? globalThis.String(ps.name) : ps.name));
				const finishIndex = (s, key, k2, inputValue, exitValue) => {
					if (exitValue._tag === "Failure") return wrapPropertyKeyIssue(s, ast, key, exitValue) ?? void_$1;
					const value = exitValue === sameExit ? inputValue : exitValue[args];
					if (k2 !== missing && value !== missing) {
						if (hasProperties && (expectedKeys.has(key) || expectedKeys.has(typeof k2 === "number" ? globalThis.String(k2) : k2))) return void_$1;
						assignProperty(s.out, k2, value);
					}
					return void_$1;
				};
				const parseIndex = (s, key, index, exitKey) => {
					if (!exitKey) {
						const eff = index.parserKey(key, s.options);
						if (!effectIsExit(eff)) return flatMap(exit(eff), (exit) => parseIndex(s, key, index, exit));
						exitKey = eff;
					}
					if (exitKey._tag === "Failure") return wrapPropertyKeyIssue(s, ast, key, exitKey) ?? void_$1;
					const k2 = exitKey === sameExit ? key : exitKey[args];
					const inputValue = s.input[key];
					const result = index.parserValue(inputValue, s.options);
					return effectIsExit(result) ? finishIndex(s, key, k2, inputValue, result) : flatMap(exit(result), (exit) => finishIndex(s, key, k2, inputValue, exit));
				};
				const parseStringIndex = (s, key, index) => {
					const inputValue = s.input[key];
					const result = index.parserValue(inputValue, s.options);
					return effectIsExit(result) ? finishIndex(s, key, key, inputValue, result) : flatMap(exit(result), (exit) => finishIndex(s, key, key, inputValue, exit));
				};
				const parseIndexes = indexCount ? iterateConcurrent()({
					onItem: (s, [key, index]) => index.is.parameter === string ? parseStringIndex(s, key, index) : parseIndex(s, key, index),
					step: (_s, _item, exit) => exit._tag === "Failure" ? exit : void 0
				}) : void 0;
				return fnUntracedEager(function* (input, options) {
					if (input === missing) return missing;
					if (!(typeof input === "object" && input !== null && !Array.isArray(input))) return yield* fail$1(new InvalidType(ast, input, options));
					compileMembers();
					const record = input;
					const out = {};
					const state = {
						ast,
						input: record,
						out,
						issues: void 0,
						options
					};
					const errorsAllOption = options.errors === "all";
					const onExcessPropertyError = options.onExcessProperty === "error";
					const concurrency = options.concurrency === void 0 ? 1 : resolveConcurrency(options.concurrency);
					const indexKeys = indexCount && onExcessPropertyError ? ast.indexSignatures.map((index) => getIndexSignatureKeys(record, index.parameter, options)) : void 0;
					if (onExcessPropertyError) {
						const coveredKeys = indexKeys ? new Set(expectedKeys) : expectedKeys;
						if (indexKeys) for (const keys of indexKeys) for (const key of keys) coveredKeys.add(key);
						const inputKeys = Reflect.ownKeys(record);
						for (let i = 0; i < inputKeys.length; i++) {
							const key = inputKeys[i];
							if (!coveredKeys.has(key) && Object.prototype.propertyIsEnumerable.call(record, key)) {
								const unexpected = new UnexpectedKey(ast, record[key], options);
								const issue = new Pointer([key], unexpected);
								if (errorsAllOption) {
									if (state.issues) state.issues.push(issue);
									else state.issues = [issue];
									continue;
								} else return yield* fail$1(new Composite(ast, [issue], input, options));
							}
						}
					}
					if (hasProperties) {
						const eff = concurrency === 1 ? parseProperties(state, properties) : parsePropertiesConcurrent(state, properties, { concurrency });
						if (eff) yield* eff;
					}
					if (indexCount && concurrency === 1) for (let i = 0; i < indexCount; i++) {
						const index = indexes[i];
						const parse = index.is.parameter === string ? parseStringIndex : parseIndex;
						const keys = indexKeys?.[i] ?? (index.is.parameter === string ? Object.keys(record) : getIndexSignatureKeys(record, index.is.parameter, options));
						for (let j = 0; j < keys.length; j++) {
							const eff = parse(state, keys[j], index);
							if (!effectIsExit(eff)) yield* eff;
							else if (eff._tag === "Failure") return yield* eff;
						}
					}
					else if (parseIndexes) {
						const keyPairs = empty();
						for (let i = 0; i < indexCount; i++) {
							const index = indexes[i];
							const keys = indexKeys?.[i] ?? (index.is.parameter === string ? Object.keys(record) : getIndexSignatureKeys(record, index.is.parameter, options));
							for (let j = 0; j < keys.length; j++) keyPairs.push([keys[j], index]);
						}
						const eff = parseIndexes(state, keyPairs, { concurrency });
						if (eff) yield* eff;
					}
					if (state.issues) return yield* fail$1(new Composite(ast, state.issues, input, options));
					return out;
				});
			};
			if (indexCount) return makeFallback();
			let fallback;
			const resume = (snapshot, index, pending) => {
				const property = properties[index];
				return flatMap(exit(pending), (exit) => {
					const state = {
						...snapshot,
						out: { ...snapshot.out }
					};
					const terminal = stepProperty(state, property, exit);
					if (terminal) return terminal;
					const done = () => succeed(state.out);
					const eff = parseProperties(state, properties.slice(index + 1));
					return eff ? flatMapEager(eff, done) : done();
				});
			};
			return (input, options) => {
				if (input === missing) return missingExit;
				if (options.errors === "all" || options.onExcessProperty !== void 0 || options.concurrency !== void 0 && resolveConcurrency(options.concurrency) !== 1) return (fallback ??= makeFallback())(input, options);
				if (!(typeof input === "object" && input !== null && !Array.isArray(input))) return fail$1(new InvalidType(ast, input, options));
				const props = compileMembers();
				const record = input;
				const out = {};
				const state = {
					ast,
					input: record,
					out,
					issues: void 0,
					options
				};
				try {
					for (let index = 0; index < props.length; index++) {
						const property = props[index];
						const name = property.name;
						const hasKey = hasPropertySignature(record, name);
						const value = hasKey ? record[name] : missing;
						const exit = property.parser(value, options);
						if (!effectIsExit(exit)) return resume(state, index, exit);
						if (exit === sameExit) {
							if (hasKey) assignProperty(out, name, value);
							continue;
						}
						const terminal = stepProperty(state, property, exit);
						if (terminal) return terminal;
					}
				} catch (error) {
					return die(error);
				}
				return succeed(out);
			};
		}
		_rebuild(recur, recurParameter, checks, encodingChecks) {
			const props = mapOrSame(this.propertySignatures, (ps) => {
				const t = recur(ps.type);
				return t === ps.type ? ps : new PropertySignature(ps.name, t);
			});
			const indexes = mapOrSame(this.indexSignatures, (is) => {
				const p = recurParameter(is.parameter);
				const t = recur(is.type);
				return p === is.parameter && t === is.type ? is : new IndexSignature(p, t);
			});
			return props === this.propertySignatures && indexes === this.indexSignatures && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Objects(props, indexes, this.annotations, checks, void 0, this.context, encodingChecks);
		}
		flip(recur) {
			return this._rebuild(recur, recur, this.encodingChecks, this.checks);
		}
		recur(recur, recurParameter = recur) {
			return this._rebuild(recur, recurParameter, this.checks, this.encodingChecks);
		}
		getExpected() {
			if (this.propertySignatures.length === 0 && this.indexSignatures.length === 0) return "object | array";
			return "object";
		}
	};
	function stepProperty(s, p, exit) {
		if (exit._tag === "Failure") return wrapPropertyKeyIssue(s, s.ast, p.name, exit);
		if (exit === sameExit) return;
		const value = exit[args];
		if (value !== missing) {
			assignProperty(s.out, p.name, value);
			return;
		}
		delete s.out[p.name];
		if (!isOptional(p.type)) {
			const issue = new Pointer([p.name], new MissingKey(p.type.context?.annotations));
			if (s.options.errors === "all") {
				if (s.issues) s.issues.push(issue);
				else s.issues = [issue];
				return;
			} else return fail$2(new Composite(s.ast, [issue], s.input, s.options));
		}
	}
	var parsePropertiesOptions = {
		onItem(s, p) {
			if (!hasPropertySignature(s.input, p.name)) return p.parser(missing, s.options);
			const value = s.input[p.name];
			assignProperty(s.out, p.name, value);
			return p.parser(value, s.options);
		},
		step: stepProperty
	};
	var parseProperties = iterateEager()(parsePropertiesOptions);
	var parsePropertiesConcurrent = iterateConcurrent()(parsePropertiesOptions);
	function combineChecks(a, b) {
		if (!a) return b;
		if (!b) return a;
		return [...a, ...b];
	}
	function struct(fields, checks, annotations) {
		return new Objects(Reflect.ownKeys(fields).map((key) => {
			return new PropertySignature(key, fields[key].ast);
		}), [], annotations, checks);
	}
	var hasPropertySignature = (input, key) => key === "__proto__" ? Object.hasOwn(input, key) : key in input;
	var bodyOwners = new WeakMap();
	function copy(ast, changes) {
		const out = Object.assign(Object.create(Object.getPrototypeOf(ast)), ast, changes);
		if (Reflect.ownKeys(changes).every((key) => key === "context" || key === "encoding")) bodyOwners.set(out, getContextOwner(ast));
		return out;
	}
	function getContextOwner(ast) {
		const existing = bodyOwners.get(ast);
		if (existing !== void 0) return existing;
		if (ast.encoding === void 0) return ast;
		const owner = Object.assign(Object.create(Object.getPrototypeOf(ast)), ast, { encoding: void 0 });
		bodyOwners.set(ast, owner);
		return owner;
	}
	function replaceEncoding(ast, encoding) {
		return ast.encoding === encoding ? ast : copy(ast, { encoding });
	}
	function replaceContext(ast, context) {
		if (ast.context === context) return ast;
		const owner = getContextOwner(ast);
		if (owner.context === context && owner.encoding === ast.encoding) return owner;
		return copy(ast, { context });
	}
	function getLastEncoding(ast) {
		return ast.encoding ? getLastEncoding(ast.encoding[ast.encoding.length - 1].to) : ast;
	}
	function annotate(ast, annotations) {
		if (ast.checks) {
			const last = ast.checks[ast.checks.length - 1];
			return replaceChecks(ast, append(ast.checks.slice(0, -1), last.annotate(annotations)));
		}
		return copy(ast, { annotations: {
			...ast.annotations,
			...annotations
		} });
	}
	function replaceChecks(ast, checks) {
		if (ast._tag === "Suspend" && checks) throw new Error("Cannot add checks to Suspend");
		if (ast.checks === checks) return ast;
		return copy(ast, { checks });
	}
	function appendChecks(ast, checks) {
		return replaceChecks(ast, combineChecks(ast.checks, checks));
	}
	function mapLink(link, f) {
		const to = f(link.to);
		return to === link.to ? link : new Link(to, link.transformation);
	}
	function updateLastLink(encoding, f) {
		const links = encoding;
		const last = links[links.length - 1];
		const out = mapLink(last, f);
		return out === last ? encoding : append(encoding.slice(0, encoding.length - 1), out);
	}
	function applyToSelfOrLastLinkEncodingIdempotent(f, options) {
		function out(ast) {
			if (ast.encoding) {
				const last = ast.encoding[ast.encoding.length - 1];
				return options?.stopAt?.(last) ? ast : replaceEncoding(ast, updateLastLink(ast.encoding, out));
			}
			return f(ast);
		}
		return memoizeIdempotent(out);
	}
	function appendTransformation(from, transformation, to) {
		const link = new Link(from, transformation);
		return replaceEncoding(to, to.encoding ? [...to.encoding, link] : [link]);
	}
	function mapOrSame(as, f) {
		let out;
		for (let i = 0; i < as.length; i++) {
			const a = as[i];
			const fa = f(a);
			if (out) out[i] = fa;
			else if (fa !== a) {
				out = new Array(as.length);
				for (let j = 0; j < i; j++) out[j] = as[j];
				out[i] = fa;
			}
		}
		return out ?? as;
	}
	function annotateKey(ast, annotations) {
		return replaceContext(ast, ast.context ? new Context(ast.context.isOptional, ast.context.isMutable, ast.context.constructorDefault, {
			...ast.context.annotations,
			...annotations
		}) : new Context(false, false, void 0, annotations));
	}
	function decodeTo$1(from, to, transformation) {
		return appendTransformation(from, transformation, to);
	}
	function isOptional(ast) {
		return ast.context?.isOptional ?? false;
	}
	function isStructuralCheck(check) {
		return check.annotations?.["~structural"] === true || check._tag === "FilterGroup" && check.checks.every(isStructuralCheck);
	}
	function extractStructuralChecks(checks) {
		function extract(check) {
			if (isStructuralCheck(check)) return [check];
			return check._tag === "FilterGroup" ? check.checks.flatMap(extract) : [];
		}
		const out = checks.flatMap(extract);
		return isArrayNonEmpty(out) ? out : void 0;
	}
	function canPreserveEncodingChecks(ast) {
		let preserve = true;
		function visit(child) {
			preserve = preserve && !child.encoding && !isSuspend(child);
			if (preserve && "recur" in child) child.recur(visit);
			return child;
		}
		if ("recur" in ast) ast.recur(visit);
		return preserve;
	}
	var toType = memoizeIdempotent((ast) => {
		const owner = getContextOwner(ast);
		if (owner !== ast) {
			const type = toType(owner);
			return type === owner && ast.encoding === void 0 ? ast : replaceContext(type, ast.context);
		}
		const type = "recur" in ast ? ast.recur(toType) : ast;
		if ("encodingChecks" in type && type.encodingChecks) {
			const checks = canPreserveEncodingChecks(ast) ? type.encodingChecks : isArrays(type) || isObjects(type) || isDeclaration(type) && type.typeParameters.length > 0 ? extractStructuralChecks(type.encodingChecks) : void 0;
			return copy(type, {
				encodingChecks: void 0,
				checks: combineChecks(type.checks, checks)
			});
		}
		return type;
	});
	var toEncoded = memoizeIdempotent((ast) => {
		return toType(flip(ast));
	});
	function flipEncoding(ast, encoding) {
		const links = encoding;
		const len = links.length;
		const last = links[len - 1];
		const ls = [new Link(flip(replaceEncoding(ast, void 0)), links[0].transformation.flip())];
		for (let i = 1; i < len; i++) ls.unshift(new Link(flip(links[i - 1].to), links[i].transformation.flip()));
		const to = flip(last.to);
		if (to.encoding) return replaceEncoding(to, [...to.encoding, ...ls]);
		else return replaceEncoding(to, ls);
	}
	var flip = memoize((ast) => {
		if (ast.encoding) return flipEncoding(ast, ast.encoding);
		const owner = getContextOwner(ast);
		if (owner !== ast) {
			const flipped = flip(owner);
			return flipped === owner ? ast : replaceContext(flipped, ast.context);
		}
		return "flip" in ast ? ast.flip(flip) : "recur" in ast ? ast.recur(flip) : ast;
	});
	function fromRefinement(ast, refinement) {
		return (input, options) => {
			if (input === missing) return missingExit;
			if (refinement(input)) return sameExit;
			return fail$1(new InvalidType(ast, input, options));
		};
	}
	var parameterFromPropertyKey = applyToSelfOrLastLinkEncodingIdempotent((ast) => {
		switch (ast._tag) {
			default: return ast;
			case "Number": return ast.toCodecStringTree();
			case "Union": return ast.recur(parameterFromPropertyKey);
		}
	});
	`${FINITE_PATTERN}`;
	`${FINITE_PATTERN}`;
	function collectIssues(checks, value, issues, ast, options) {
		for (let i = 0; i < checks.length; i++) {
			const check = checks[i];
			if (check._tag === "FilterGroup") {
				issues = collectIssues(check.checks, value, issues, ast, options);
				if (issues && (options.errors !== "all" || issues[issues.length - 1].filter.aborted)) return issues;
			} else {
				const issue = check.run(value, ast, options);
				if (issue) {
					const filter = new Filter$1(check, issue, value, options);
					if (issues) issues.push(filter);
					else issues = [filter];
					if (options.errors !== "all" || check.aborted) return issues;
				}
			}
		}
		return issues;
	}
	function getConstructorDescriptor(ast) {
		if (!isDeclaration(ast)) return void 0;
		const getDescriptor = ast.annotations?.[CONSTRUCTOR_ANNOTATION_KEY];
		return isFunction(getDescriptor) ? getDescriptor(ast.typeParameters) : void 0;
	}
	var flatMapTransformation = (result, current, f) => result === sameExit ? f(current) : flatMapEager(result, f);
	function compileTransformation(transformation) {
		const apply = compileTransformationUnsafe(transformation);
		return (result, current, options) => {
			try {
				return apply(result, current, options);
			} catch (error) {
				return die(error);
			}
		};
	}
	function compileTransformationUnsafe(transformation) {
		if (transformation._tag === "Middleware") return (result, current, options) => {
			return fromOptionalEffect(result === sameExit ? transformation.decode(succeed(toOption(current)), options) : transformation.decode(mapEager(result, toOption), options));
		};
		const getter = transformation.decode;
		switch (getter._tag) {
			case "Passthrough": return (result, current) => result === sameExit ? succeed(current) : result;
			case "Transform": {
				const transform = (value) => value === missing ? missingExit : succeed(getter.transform(value));
				return (result, current) => flatMapTransformation(result, current, transform);
			}
			case "TransformOptional": {
				const transform = (value) => fromOptionExit(getter.transform(toOption(value)));
				return (result, current) => flatMapTransformation(result, current, transform);
			}
			case "TransformEffect": return (result, current, options) => flatMapTransformation(result, current, (value) => value === missing ? missingExit : getter.transform(value, options));
			case "TransformOptionalEffect": return (result, current, options) => flatMapTransformation(result, current, (value) => fromOptionalEffect(getter.transform(toOption(value), options)));
		}
	}
	var fromOptionalEffect = (effect) => flatMapEager(effect, fromOptionExit);
	var wrapEncoding = (ast, input, options, effect) => catchCause(effect, (cause) => failCauseSync(() => map(cause, (issue) => new Encoding(ast, issue, input, options))));
	function makeConstructorParser(descriptor, compile) {
		const transform = compileTransformation(descriptor.link.transformation);
		let sourceParser;
		return (input, options) => {
			if (input === missing) return missingExit;
			if (descriptor.isConstructed(input)) return sameExit;
			const result = (sourceParser ??= compile(descriptor.link.to))(input, options);
			return transform(result, input, options);
		};
	}
	function withDefault(ast, parser) {
		const defaultValue = ast.context.constructorDefault;
		return (input, options) => {
			if (input !== missing && input !== void 0) return parser(input, options);
			const result = defaultValue;
			if (effectIsExit(result) && result._tag === "Success") {
				const local = parser(result[args], options);
				return local === sameExit ? result : local;
			}
			return flatMapEager(wrapEncoding(ast, input, options, result), (value) => {
				const local = parser(value, options);
				return local === sameExit ? succeed(value) : local;
			});
		};
	}
	function compileField(ast, compile) {
		const parser = compile(ast);
		return ast.context?.constructorDefault === void 0 ? parser : withDefault(ast, parser);
	}
	function compile(ast, compile, compileField, base, specialize) {
		if (ast._tag === "Declaration") for (const parameter of ast.typeParameters) compile(parameter);
		const descriptor = compileField ? getConstructorDescriptor(ast) : void 0;
		const parser = descriptor ? makeConstructorParser(descriptor, compile) : base ?? ast.getParser(compile, compileField);
		const checks = ast.checks;
		const links = ast.encoding;
		const transformations = links?.map((link) => compileTransformation(link.transformation));
		const encodingChecks = ast.encodingChecks;
		if (!links && !checks && !encodingChecks) return parser;
		let encodingParsers;
		const parseChecks = (input, options) => {
			let result = parser(input, options);
			try {
				if (encodingChecks && !options.disableChecks) {
					if (effectIsExit(result)) {
						if (result._tag === "Success") {
							const output = result === sameExit ? input : result[args];
							if (input !== missing && output !== missing) {
								const issues = collectIssues(encodingChecks, input, void 0, ast, options);
								if (issues) result = fail$1(new Composite(ast, issues, input, options));
							}
						}
					} else result = flatMap(result, (value) => {
						if (input !== missing && value !== missing) {
							const issues = collectIssues(encodingChecks, input, void 0, ast, options);
							if (issues) return fail$1(new Composite(ast, issues, input, options));
						}
						return succeed$1(value);
					});
				}
				if (checks && !options.disableChecks) {
					if (effectIsExit(result)) {
						if (result._tag === "Success") {
							const value = result === sameExit ? input : result[args];
							if (value === missing) return result;
							const issues = collectIssues(checks, value, void 0, ast, options);
							if (issues) result = fail$1(new Composite(ast, issues, value, options));
						}
					} else result = flatMap(result, (value) => {
						if (value !== missing) {
							const issues = collectIssues(checks, value, void 0, ast, options);
							if (issues) return fail$1(new Composite(ast, issues, value, options));
						}
						return succeed$1(value);
					});
				}
				return result;
			} catch (error) {
				return die(error);
			}
		};
		const parseLocal = specialize === void 0 ? parseChecks : specialize(parseChecks);
		if (!links) return parseLocal;
		return (input, options) => {
			const parsers = encodingParsers ??= links.map((link) => compile(link.to));
			let current = input;
			let result = parsers[parsers.length - 1](input, options);
			for (let i = links.length - 1; i >= 0; i--) {
				result = transformations[i](result, current, options);
				if (i !== 0) {
					const next = parsers[i - 1];
					if (result._tag === "Success") {
						current = result[args];
						result = next(current, options);
					} else result = flatMapEager(result, (value) => {
						const nextResult = next(value, options);
						return nextResult === sameExit ? succeed(value) : nextResult;
					});
				}
			}
			if (result._tag === "Success") {
				const value = result[args];
				const local = parseLocal(value, options);
				return local === sameExit ? result : local;
			}
			result = wrapEncoding(ast, input, options, result);
			return flatMapEager(result, (value) => {
				const local = parseLocal(value, options);
				return local === sameExit ? succeed(value) : local;
			});
		};
	}
	var invalid = Symbol();
	var cache = new WeakMap();
	var compilerAdaptersEnabled = false;
	var decodeChild = (ast) => compilerAdaptersEnabled ? lazyParser(resolve, ast, "parser") : resolve(ast).parser;
	var makeChild = (ast) => compilerAdaptersEnabled ? lazyParser(resolve, ast, "makeEffect") : resolve(ast).makeEffect;
	var makeField = (ast) => compileField(ast, makeChild);
	var InterpretedEntry = class {
		ast;
		constructor(ast) {
			this.ast = ast;
		}
		get decodeEffect() {
			return this.cachedDecodeEffect ??= compile(this.ast, decodeChild);
		}
		get parser() {
			return this.decodeEffect;
		}
		get makeEffect() {
			return this.cachedMakeEffect ??= compile(this.ast, makeChild, makeField);
		}
	};
	function lazyParser(resolve, ast, operation) {
		const entry = resolve(ast);
		if (entry.compiled === void 0 || Object.hasOwn(entry, operation)) return entry[operation];
		let parser;
		return (input, options) => (parser ??= entry[operation])(input, options);
	}
	function resolve(ast) {
		const cached = cache.get(ast);
		if (cached !== void 0) return cached;
		const entry = new InterpretedEntry(ast);
		cache.set(ast, entry);
		return entry;
	}
	function makeEffect(schema) {
		const ast = schema.ast;
		let parser;
		return (input, options) => {
			return (parser ??= runWithCompiler(constructorCompiler, toType(ast)))(input, options?.disableChecks ? options?.parseOptions ? {
				...options.parseOptions,
				disableChecks: true
			} : { disableChecks: true } : options?.parseOptions);
		};
	}
	function makeOption(schema) {
		const parser = makeEffect(schema);
		return (input, options) => {
			const exit = runSyncExit(parser(input, options));
			if (isSuccess(exit)) return some(exit.value);
			getSchemaIssueOrThrow(exit.cause, "Option adapter can only return none for schema issues");
			return none();
		};
	}
	function make$2(schema) {
		return makeConstructorSync(toType(schema.ast));
	}
	function decodeUnknownEffect(schema, options) {
		const parser = run(schema.ast);
		return options === void 0 ? parser : (input, overrideOptions) => parser(input, mergeParseOptions(options, overrideOptions));
	}
	function decodeUnknownOption(schema, options) {
		return asOption(decodeUnknownEffect(schema, options));
	}
	var decodeOption$1 = decodeUnknownOption;
	var mergeParseOptions = (options, overrideOptions) => overrideOptions ? {
		...options,
		...overrideOptions
	} : options;
	var getValue = (value) => {
		if (value === missing) return fail$1(new InvalidValue());
		return succeed$1(value);
	};
	function run(ast) {
		return runWithCompiler(normalCompiler, ast);
	}
	function parserResult(result, input) {
		if (result === sameExit) return succeed$1(input);
		if (!effectIsExit(result)) return flatMapEager(result, getValue);
		return result["~effect/Effect/args"] === missing ? getValue(missing) : result;
	}
	function runWithCompiler(compiler, ast) {
		let parser;
		return (input, options) => {
			const result = (parser ??= compiler(ast))(input, options ?? defaultParseOptions);
			if (result === sameExit) return succeed$1(input);
			if (!effectIsExit(result)) return flatMapEager(result, getValue);
			return result["~effect/Effect/args"] === missing ? getValue(missing) : result;
		};
	}
	function asExit(parser) {
		return (input, options) => runSyncExit(parser(input, options));
	}
	function asOption(parser) {
		const parserExit = asExit(parser);
		return (input, options) => {
			const exit = parserExit(input, options);
			if (isSuccess(exit)) return some(exit.value);
			getSchemaIssueOrThrow(exit.cause, "Option adapter can only return none for schema issues");
			return none();
		};
	}
	function runSync(effect, message) {
		const exit = runSyncExit(effect);
		if (isSuccess(exit)) return exit.value;
		const issue = getSchemaIssueOrThrow(exit.cause, message);
		throw new Error("Schema validation failed", { cause: issue });
	}
	var constructorDefectMessage = "Constructor adapter can only throw schema issues";
	function throwConstructorDefect(error) {
		throw new Error(constructorDefectMessage, { cause: die$1(error) });
	}
	function makeConstructorSync(ast) {
		let entry;
		return (input, options) => constructSync(entry ??= resolve(ast), input, options);
	}
	function constructSync(entry, input, options) {
		const parseOptions = options?.disableChecks ? options.parseOptions ? {
			...options.parseOptions,
			disableChecks: true
		} : { disableChecks: true } : options?.parseOptions ?? defaultParseOptions;
		const make = entry.make;
		if (make !== void 0 && input !== missing) {
			let output;
			try {
				output = make(input, parseOptions);
			} catch (error) {
				throwConstructorDefect(error);
			}
			if (output !== invalid && output !== missing) return output;
		}
		return runSync(parserResult(entry.makeEffect(input, parseOptions), input), constructorDefectMessage);
	}
	var normalCompiler = (ast) => resolve(ast).parser;
	var constructorCompiler = (ast) => resolve(ast).makeEffect;
	var TypeId$2 = "~effect/Schema/Schema";
	var RebuildOptions = Symbol();
	var SchemaProto = {
		[TypeId$2]: TypeId$2,
		get make() {
			const value = make$2(this);
			Object.defineProperty(this, "make", {
				value,
				enumerable: true
			});
			return value;
		},
		get makeEffect() {
			const value = makeEffect(this);
			Object.defineProperty(this, "makeEffect", {
				value,
				enumerable: true
			});
			return value;
		},
		get makeOption() {
			const value = makeOption(this);
			Object.defineProperty(this, "makeOption", {
				value,
				enumerable: true
			});
			return value;
		},
		pipe() {
			return pipeArguments(this, arguments);
		},
		annotate(annotations) {
			return this.rebuild(annotate(this.ast, annotations));
		},
		annotateKey(annotations) {
			return this.rebuild(annotateKey(this.ast, annotations));
		},
		check(...checks) {
			return this.rebuild(appendChecks(this.ast, checks));
		},
		rebuild(ast) {
			return make$1(ast, this[RebuildOptions]);
		}
	};
	function make$1(ast, options) {
		function Schema() {}
		const self = Object.setPrototypeOf(Schema, SchemaProto);
		if (options && (Object.hasOwn(options, "name") || Object.hasOwn(options, "length") || Object.hasOwn(options, "__proto__"))) Object.defineProperties(self, Object.getOwnPropertyDescriptors({ ...options }));
		else Object.assign(self, options);
		self[RebuildOptions] = options;
		self.ast = ast;
		return self;
	}
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...BaseProto });
	({ ...BaseProto });
	var decodeOption = decodeOption$1;
	var make = make$1;
	var String$1 = make(string);
	function makeStruct(ast, fields) {
		return make(ast, {
			fields,
			mapFields(f, options) {
				const fields = f(this.fields);
				return makeStruct(struct(fields, options?.unsafePreserveChecks ? this.ast.checks : void 0), fields);
			}
		});
	}
	function Struct(fields) {
		return makeStruct(struct(fields, void 0), fields);
	}
	function decodeTo(to, transformation) {
		return (from) => {
			return make(decodeTo$1(from.ast, to.ast, transformation ? makeTransformation(transformation) : passthrough()), {
				from,
				to
			});
		};
	}
	globalThis.RegExp;
	globalThis.URL;
	var JsonString = String$1.annotate({ expected: "a string that will be decoded as JSON" });
	function fromJsonString(schema, options) {
		return JsonString.pipe(decodeTo(schema, fromJsonString$1(options)));
	}
	globalThis.File;
	globalThis.URLSearchParams;
	globalThis.Uint8Array;
	var _GM = (() => typeof GM != "undefined" ? GM : void 0)();
	var relayUrl = "https://personal.masseater.dev/scrap-request";
	var RelaySession = fromJsonString(Struct({ sessionUrl: String$1 }));
	var successStatus = 200;
	var redirectStatus = 300;
	var relayBody = (request) => JSON.stringify({
		url: request.url,
		title: trim(request.title),
		highlight: trim(request.highlight),
		focus: trim(request.focus)
	});
	var relayResponse = (response) => {
		if (response.finalUrl !== "https://personal.masseater.dev/scrap-request") return { status: "login" };
		const failed = {
			status: "failed",
			reason: `HTTP ${String(response.status)}: ${response.text}`
		};
		if (response.status < successStatus || response.status >= redirectStatus) return failed;
		return match$4(decodeOption(RelaySession)(response.text), {
			onNone: () => failed,
			onSome: (session) => ({
				status: "started",
				sessionUrl: session.sessionUrl
			})
		});
	};
	var fire = (request) => tryPromise({
		try: () => _GM.xmlHttpRequest({
			method: "POST",
			url: relayUrl,
			headers: { "content-type": "application/json" },
			data: relayBody(request)
		}),
		catch: () => "ネットワークエラーで送れませんでした"
	}).pipe(match({
		onFailure: (reason) => ({
			status: "failed",
			reason
		}),
		onSuccess: (response) => relayResponse({
			status: response.status,
			finalUrl: response.finalUrl,
			text: response.responseText
		})
	}));
	var style = `
dialog { width: min(32rem, calc(100vw - 2rem)); padding: 1rem; border: 1px solid #888; border-radius: 0.5rem; font: 14px/1.6 system-ui, sans-serif; color: #111; background: #fff; }
label { display: block; margin-top: 0.75rem; font-weight: bold; }
textarea { box-sizing: border-box; width: 100%; min-height: 5rem; margin-top: 0.25rem; font: inherit; font-weight: normal; }
menu { display: flex; gap: 0.5rem; justify-content: flex-end; margin: 1rem 0 0; padding: 0; }
output { display: block; margin-top: 0.75rem; white-space: pre-wrap; }
`;
	var element = (tag, text) => {
		const created = document.createElement(tag);
		created.textContent = text;
		return created;
	};
	var labeled = (text, control) => {
		const label = element("label", text);
		label.append(control);
		return label;
	};
	var textarea = (value) => {
		const created = document.createElement("textarea");
		created.value = value;
		return created;
	};
	var button = (text) => {
		const created = element("button", text);
		created.type = "button";
		return created;
	};
	var menuOf = (buttons) => {
		const menu = document.createElement("menu");
		menu.append(...buttons);
		return menu;
	};
	var selectedText = () => fromNullishOr(globalThis.getSelection()).pipe(map$5((selection) => selection.toString()), getOrElse(() => ""));
	var createForm = () => {
		const highlight = textarea(selectedText());
		const focus = textarea("");
		return {
			elements: [labeled("気になった部分", highlight), labeled("重点的にまとめてほしいこと", focus)],
			read: () => ({
				highlight: highlight.value,
				focus: focus.value
			})
		};
	};
	var messageOf = (state) => {
		if (state.status === "sending") return "送信しています。";
		if (state.status === "started") return "送りました。";
		if (state.status === "login") return "personal.masseater.dev にログインしてください。ログイン用のタブを開きます。ログインしたらもう一度送ってください。";
		return `起動できませんでした。${state.reason}`;
	};
	var tabFor = (state) => {
		if (state.status === "login") return some(relayUrl);
		return none();
	};
	var openTab = (state) => match$4(tabFor(state), {
		onNone: () => void_,
		onSome: (url) => promise(() => Promise.resolve(_GM.openInTab(url, { active: true }))).pipe(asVoid)
	});
	var submit = (values, render) => gen(function* submitRequest() {
		render({ status: "sending" });
		const response = yield* fire({
			url: location.href,
			title: document.title,
			highlight: values.highlight,
			focus: values.focus
		});
		render(response);
		yield* openTab(response);
	});
	var renderer = (output, send) => (state) => {
		output.textContent = messageOf(state);
		send.toggleAttribute("disabled", state.status === "sending" || state.status === "started");
	};
	var buildDialog = () => {
		const form = createForm();
		const send = button("scrap にする");
		const close = button("閉じる");
		const output = document.createElement("output");
		const dialog = document.createElement("dialog");
		dialog.append(element("strong", document.title), ...form.elements, menuOf([close, send]), output);
		close.addEventListener("click", () => {
			dialog.close();
		});
		send.addEventListener("click", () => {
			runFork(submit(form.read(), renderer(output, send)));
		});
		return dialog;
	};
	var openPanel = () => {
		const host = document.createElement("div");
		const root = host.attachShadow({ mode: "closed" });
		const dialog = buildDialog();
		dialog.addEventListener("close", () => {
			host.remove();
		});
		root.append(element("style", style), dialog);
		document.body.append(host);
		dialog.showModal();
	};
	runFork(promise(() => Promise.resolve(_GM.registerMenuCommand("このページを scrap にする", openPanel))));
})();
