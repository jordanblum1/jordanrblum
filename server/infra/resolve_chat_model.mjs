const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';
const DIRECT_DEFAULT_MODELS = new Set(['claude-haiku-4-5-20251001', 'claude-sonnet-5']);
const OPENROUTER_MODEL = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/;

const [existingModel = '', overrideModel = ''] = process.argv.slice(2);

function isSupported(model) {
  return OPENROUTER_MODEL.test(model) && model !== 'openrouter/auto';
}

if (existingModel && !DIRECT_DEFAULT_MODELS.has(existingModel) && !isSupported(existingModel)) {
  console.error(
    `Existing CHAT_MODEL is not a supported OpenRouter provider/model slug: ${JSON.stringify(existingModel)}`,
  );
  process.exit(1);
}

if (overrideModel && !isSupported(overrideModel)) {
  console.error(`CHAT_MODEL override must be an exact OpenRouter provider/model slug; received ${JSON.stringify(overrideModel)}`);
  process.exit(1);
}

const model =
  overrideModel || (!existingModel || DIRECT_DEFAULT_MODELS.has(existingModel) ? DEFAULT_MODEL : existingModel);
process.stdout.write(model);
