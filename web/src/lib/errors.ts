export class MissingKeyError extends Error { constructor() { super("No Gemini API key set."); this.name = "MissingKeyError"; } }
export class RateLimitError extends Error { constructor(msg = "Gemini rate limit exceeded.") { super(msg); this.name = "RateLimitError"; } }
export class ModelOverloadedError extends Error { constructor(msg = "The model is overloaded (high demand).") { super(msg); this.name = "ModelOverloadedError"; } }
export class ModelOutputError extends Error { constructor(msg = "Model returned invalid output.") { super(msg); this.name = "ModelOutputError"; } }
export class NoTextError extends Error { constructor() { super("This PDF has no selectable text (image-only PDFs aren't supported)."); this.name = "NoTextError"; } }
export class InvalidKeyError extends Error { constructor(msg = "Gemini rejected the API key.") { super(msg); this.name = "InvalidKeyError"; } }
export class OfflineError extends Error { constructor(msg = "Could not reach Google — you appear to be offline.") { super(msg); this.name = "OfflineError"; } }
export class NotAResumeError extends Error { constructor(msg = "The uploaded document doesn't look like a resume.") { super(msg); this.name = "NotAResumeError"; } }
