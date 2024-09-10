var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  bufferAsync: () => bufferAsync,
  isEmailSync: () => isEmailSync,
  maximumLength: () => maximumLength,
  minValue: () => minValue,
  minimumLength: () => minimumLength,
  required: () => required,
  throttleQueueAsync: () => throttleQueueAsync,
  useValidation: () => useValidation,
  validateIf: () => validateIf
});
module.exports = __toCommonJS(src_exports);

// src/finalFormUtilities.ts
function bufferAsync(func) {
  let id = 0;
  let queuedFunc = void 0;
  return (...params) => {
    var _a;
    const currentId = ++id;
    queuedFunc = (_a = queuedFunc == null ? void 0 : queuedFunc.then(() => {
      if (id == currentId) {
        queuedFunc = func(...params).then((response) => {
          queuedFunc = void 0;
          return response;
        });
        return queuedFunc;
      }
      return void 0;
    })) != null ? _a : func(...params).then((response) => {
      queuedFunc = void 0;
      return response;
    });
    return queuedFunc;
  };
}
function throttleQueueAsync(func, delay) {
  let id = 0;
  let previousExecTime = void 0;
  return (...params) => new Promise((resolve) => {
    const currentId = ++id;
    const nowTime = (/* @__PURE__ */ new Date()).getTime();
    previousExecTime != null ? previousExecTime : previousExecTime = nowTime - delay;
    const remaining = nowTime - previousExecTime - delay;
    if (remaining < 0) {
      new Promise((resolve2) => setTimeout(resolve2, -1 * remaining)).then(() => {
        previousExecTime = (/* @__PURE__ */ new Date()).getTime();
        if (currentId == id) {
          resolve(func(...params));
        }
        resolve(void 0);
      });
    } else {
      previousExecTime = nowTime;
      resolve(func(...params));
    }
  });
}
function reduceUndefined(array, getter = (val) => val) {
  return array.reduce((results, item) => {
    if (item != void 0) {
      const target = getter(item);
      if (target != void 0) {
        results.push(target);
      }
    }
    return results;
  }, []);
}
function flatMap(array) {
  return array.reduce((results, item) => {
    if (item != void 0) {
      if (item instanceof Array) {
        for (const subitem of item) {
          if (subitem != void 0) {
            results.push(subitem);
          }
        }
      } else {
        results.push(item);
      }
    }
    return results;
  }, []);
}

// src/finalFormValidators.ts
function required() {
  return (params) => ({
    isValid: params.value != void 0 && String(params.value).trim().length > 0,
    errorMessage: "This field is required"
  });
}
function validateIf(condition, validators) {
  return (params) => __async(this, null, function* () {
    if (condition(params) == false) {
      return {
        isValid: true
      };
    }
    return validators;
  });
}
function minimumLength(minLength) {
  return (params) => {
    var _a;
    const val = String((_a = params.value) != null ? _a : "");
    return {
      isValid: val.length >= minLength,
      errorMessage: `Too short (${val.length} / ${minLength})`
    };
  };
}
function maximumLength(maxLength) {
  return (params) => {
    var _a, _b, _c, _d;
    return {
      isValid: ((_b = (_a = params.value) == null ? void 0 : _a.length) != null ? _b : 0) <= maxLength,
      errorMessage: `Too long (${(_d = (_c = params.value) == null ? void 0 : _c.length) != null ? _d : 0} / ${maxLength})`
    };
  };
}
function minValue(minValue2) {
  return (params) => ({
    isValid: params.value != void 0 && params.value >= minValue2,
    errorMessage: `Must be atleast ${minValue2}`
  });
}
function isEmailSync() {
  return (params) => ({
    isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
    errorMessage: "Invalid email format"
  });
}

// src/useValidation.ts
var import_vue3 = require("vue");

// src/services/validatorInvocation.ts
var import_vue2 = require("vue");

// src/services/validatorProcessing.ts
var import_vue = require("vue");
function uniqueId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
}
function processValidators(validators, markReactive, useExistingIdWithIndex) {
  const processedValidators = [];
  let getId = (index) => `${markReactive ? "reactive" : "lazy"}-${uniqueId()}`;
  if (useExistingIdWithIndex != void 0) {
    getId = (index) => `${useExistingIdWithIndex}-${index}`;
  }
  for (const [index, validator] of validators.entries()) {
    processedValidators.push({
      validatorId: getId(index),
      validator,
      isLazy: !markReactive,
      isReactive: markReactive,
      optimized: false,
      previouslyReturnedValidators: false,
      previouslySpawnedValidators: {},
      spawnedValidators: {}
    });
  }
  return processedValidators;
}
function configureValidationOnProperty(object, validation, arrayParents = []) {
  var _a, _b, _c, _d;
  const isArrayValidation = validation.$each != void 0;
  const validationState = (0, import_vue.reactive)({
    isValid: (0, import_vue.computed)(() => {
      var _a2, _b2;
      const isLazyValid = (_a2 = validationConfig.lazyIsValid.value) != null ? _a2 : false;
      const isReactiveValid = (_b2 = validationConfig.reactiveIsValid.value) != null ? _b2 : false;
      return isLazyValid && isReactiveValid;
    }),
    /** State indicating that validators are currently being called. */
    isValidating: (0, import_vue.computed)(() => validationConfig.validatingReactive.value || validationConfig.validatingLazy.value),
    isErrored: (0, import_vue.computed)(() => validationState.validationResults.some((x) => x.isValid == false)),
    /** Array of the error messages that come from the {@link validationResults[]} for ease of use. */
    errorMessages: (0, import_vue.computed)(() => flatMap(reduceUndefined(validationState.validationResults, (val) => val.isValid ? void 0 : val.errorMessage))),
    validationResults: (0, import_vue.computed)(() => {
      var _a2, _b2;
      return ((_a2 = validationConfig.reactiveValidationResults.value) != null ? _a2 : []).concat((_b2 = validationConfig.lazyValidationResults.value) != null ? _b2 : []);
    }),
    arrayState: (0, import_vue.computed)(() => {
      if (Array.isArray(object.value) === false || validationConfig.elementValidation === void 0) {
        return void 0;
      }
      const arr = object.value;
      const elValidation = validationConfig.elementValidation;
      const validationMap = validationConfig.arrayConfigMap;
      let tempId;
      const objectIds = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].$ffId === void 0) {
          Object.defineProperty(
            arr[i],
            `$ffId`,
            {
              value: `${validationConfig.id}-${validationConfig.elementId++}`,
              writable: false,
              configurable: false,
              enumerable: false
            }
          );
        }
        tempId = arr[i].$ffId;
        objectIds.push(tempId);
        if (validationMap[tempId]) {
          continue;
        }
        const objectGetter = (0, import_vue.computed)(() => arr[i]);
        if (isPrimitiveOrArrayValidation(elValidation)) {
          const typedValidation = elValidation;
          const elValidationConfig = configureValidationOnProperty(
            objectGetter,
            typedValidation,
            validationConfig.arrayParents.concat(objectGetter)
          );
          validationMap[tempId] = {
            validationConfigs: [elValidationConfig],
            validationState: elValidationConfig.validationState
          };
        } else {
          const typedObject = arr[i];
          const typedValidation = elValidation;
          const elValidationSetup = setupNestedPropertiesForValidation(
            typedObject,
            typedValidation,
            validationConfig.arrayParents.concat(objectGetter)
          );
          validationMap[tempId] = {
            validationConfigs: elValidationSetup.validationConfigs,
            validationState: elValidationSetup.state
          };
        }
      }
      const elemValidationState = [];
      const prunedValidationMap = {};
      for (const objectId of objectIds) {
        elemValidationState.push(validationMap[objectId].validationState);
        prunedValidationMap[objectId] = validationMap[objectId];
      }
      validationConfig.arrayConfigMap = prunedValidationMap;
      return elemValidationState;
    })
  });
  const initIsLazyValid = !(((_b = (_a = validation.$lazy) == null ? void 0 : _a.length) != null ? _b : -1) > 0);
  const initIsReactiveValid = !(((_d = (_c = validation.$reactive) == null ? void 0 : _c.length) != null ? _d : -1) > 0);
  const reactiveValidators = validation.$reactive ? processValidators(validation.$reactive, true) : [];
  const lazyValidators = validation.$lazy ? processValidators(validation.$lazy, false) : [];
  const validationConfig = {
    id: uniqueId(),
    validationIterationId: 0,
    reactiveIsValid: (0, import_vue.ref)(initIsReactiveValid),
    reactiveValidationResults: (0, import_vue.ref)([]),
    validatingReactive: (0, import_vue.ref)(false),
    lazyIsValid: (0, import_vue.ref)(initIsLazyValid),
    lazyValidationResults: (0, import_vue.ref)([]),
    validatingLazy: (0, import_vue.ref)(false),
    property: object,
    validation,
    validationState,
    reactiveProcessedValidators: reactiveValidators,
    lazyProcessedValidators: lazyValidators,
    arrayConfigMap: {},
    hasElementValidation: isArrayValidation,
    elementId: 0,
    elementValidation: validation.$each,
    arrayParents: (0, import_vue.reactive)(arrayParents)
  };
  return validationConfig;
}
function setupNestedPropertiesForValidation(object, validation, arrayParents = []) {
  const resultConfigs = [];
  const resultState = {};
  if (validation !== void 0) {
    recursiveSetup(object, validation);
  }
  function recursiveSetup(rObject, rValidation) {
    for (const key in rValidation) {
      const property = (0, import_vue.computed)(() => rObject[key]);
      if (isPrimitiveOrArrayValidation(rValidation[key])) {
        const propertyValidation = rValidation[key];
        const validatedPropertyConfig = configureValidationOnProperty(property, propertyValidation, arrayParents);
        resultConfigs.push(validatedPropertyConfig);
        resultState[key] = validatedPropertyConfig.validationState;
      } else {
        const nestedState = {};
        const nestedValidation = rValidation[key];
        resultState[key] = nestedState;
        recursiveSetup(
          property,
          nestedValidation
        );
      }
    }
  }
  return {
    /** All the validation configs from all the validators the user defined */
    validationConfigs: resultConfigs,
    /** The object that can be used to represent that state of validation for the provided object. */
    state: resultState
  };
}
function isPrimitiveOrArrayValidation(validation) {
  return (validation == null ? void 0 : validation.$reactive) !== void 0 || (validation == null ? void 0 : validation.$lazy) !== void 0 || (validation == null ? void 0 : validation.$each) !== void 0;
}

// src/services/validatorInvocation.ts
var ThrottleDurationMs = 500;
function invokeAndOptimizeValidators(propertyConfig, parent, args, validators, iterationId) {
  return __async(this, null, function* () {
    let isAllValid = true;
    const resultProcessor = (processedValidator, ret) => {
      if (iterationId !== propertyConfig.validationIterationId) {
        return;
      }
      if (ret.isValid === false) {
        isAllValid = false;
      }
      ret.identifier = processedValidator.validatorId;
      const result = propertyConfig.reactiveValidationResults.value.find((x) => x.identifier == ret.identifier);
      if (result !== void 0) {
        Object.assign(result, ret);
      } else {
        propertyConfig.reactiveValidationResults.value.push(ret);
      }
    };
    const { asyncPromises, validatorsWhichPreviouslyReturnedValidators } = recursiveInvokeAndOptimizeValidators(
      propertyConfig,
      parent,
      args,
      validators,
      iterationId,
      resultProcessor,
      true,
      1
    );
    yield Promise.all(asyncPromises);
    if (iterationId === propertyConfig.validationIterationId) {
      for (const processedValidator of validatorsWhichPreviouslyReturnedValidators) {
        for (const validatorId of Object.keys(processedValidator.previouslySpawnedValidators)) {
          if (processedValidator.spawnedValidators[validatorId] == void 0) {
            const index = propertyConfig.reactiveValidationResults.value.findIndex((x) => x.identifier === validatorId);
            if (index !== -1) {
              propertyConfig.reactiveValidationResults.value.splice(index);
            }
          }
        }
      }
    }
    return isAllValid;
  });
}
function recursiveInvokeAndOptimizeValidators(propertyConfig, parent, args, validators, iterationId, processValidatorResult, shouldOptimize, recursionCount) {
  const property = propertyConfig.property.value;
  const allPromises = [];
  const allResults = [];
  const validatorsWhichPreviouslyReturnedValidators = [];
  for (const processedValidator of validators) {
    let checkForValidatorReturn = false;
    if (processedValidator.previouslyReturnedValidators) {
      processedValidator.previouslySpawnedValidators = processedValidator.spawnedValidators;
      processedValidator.spawnedValidators = {};
      checkForValidatorReturn = true;
    }
    processedValidator.previouslyReturnedValidators = false;
    let validationReturn;
    if (processedValidator.computedValidator === void 0) {
      const params = {
        value: property,
        parent,
        args,
        arrayParents: propertyConfig.arrayParents.map((x) => x.value)
      };
      validationReturn = processedValidator.validator(params);
    } else {
      validationReturn = processedValidator.computedValidator.value;
    }
    if (validationReturn instanceof Promise) {
      const past = Date.now();
      allPromises.push(
        validationReturn.then((ret) => __async(this, null, function* () {
          if (ret === void 0) {
            if (checkForValidatorReturn) {
              validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
            }
            return void 0;
          }
          const duration = Date.now() - past;
          if (shouldOptimize && duration > ThrottleDurationMs && processedValidator.optimized === false) {
            processedValidator.optimized = true;
            if (duration < 2 * ThrottleDurationMs) {
              processedValidator.validator = throttleQueueAsync(processedValidator.validator, ThrottleDurationMs);
            } else {
              processedValidator.validator = bufferAsync(processedValidator.validator);
            }
          }
          if (Array.isArray(ret)) {
            const { asyncPromises, syncResults } = handleReturnedValidators(
              propertyConfig,
              parent,
              args,
              iterationId,
              processValidatorResult,
              processedValidator,
              ret,
              recursionCount
            );
            allResults.push(...syncResults);
            yield Promise.all(asyncPromises);
            return;
          } else if (checkForValidatorReturn) {
            validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
          }
          processValidatorResult(processedValidator, ret);
        }))
      );
    } else if (Array.isArray(validationReturn)) {
      const { asyncPromises, syncResults } = handleReturnedValidators(
        propertyConfig,
        parent,
        args,
        iterationId,
        processValidatorResult,
        processedValidator,
        validationReturn,
        recursionCount
      );
      allPromises.push(...asyncPromises);
      allResults.push(...syncResults);
    } else {
      if (checkForValidatorReturn) {
        validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
      }
      if (validationReturn !== void 0) {
        if (shouldOptimize && processedValidator.optimized === false) {
          const typedValidator = processedValidator.validator;
          processedValidator.computedValidator = (0, import_vue2.computed)(() => {
            console.log("computed ran instead");
            const params = {
              value: propertyConfig.property.value,
              // Setup a reactive dependency on the property value
              parent,
              args,
              arrayParents: propertyConfig.arrayParents.map((x) => x.value)
            };
            return typedValidator(params);
          });
          processedValidator.optimized = true;
          processedValidator.validator = () => processedValidator.computedValidator.value;
        }
        allResults.push(validationReturn);
        processValidatorResult(processedValidator, validationReturn);
      }
    }
  }
  return {
    asyncPromises: allPromises,
    syncResults: allResults,
    validatorsWhichPreviouslyReturnedValidators
  };
}
function handleReturnedValidators(propertyConfig, parent, args, iterationId, processValidatorResult, parentProcessedValidator, returnedValidators, recursionCount) {
  const processedRetValidators = processValidators(
    returnedValidators,
    parentProcessedValidator.isReactive,
    parentProcessedValidator.validatorId
  );
  const response = recursiveInvokeAndOptimizeValidators(
    propertyConfig,
    parent,
    args,
    processedRetValidators,
    iterationId,
    processValidatorResult,
    false,
    ++recursionCount
  );
  const spawnedValidatorsMap = {};
  for (const processedValidator of processedRetValidators) {
    spawnedValidatorsMap[processedValidator.validatorId] = processedValidator;
  }
  parentProcessedValidator.spawnedValidators = spawnedValidatorsMap;
  parentProcessedValidator.previouslyReturnedValidators = true;
  return response;
}
function invokeReactivePropertyValidators(propertyConfig, parent, args, iterationId) {
  return __async(this, null, function* () {
    propertyConfig.validatingReactive.value = true;
    const reactiveValidators = propertyConfig.reactiveProcessedValidators;
    const isAllValid = yield invokeAndOptimizeValidators(
      propertyConfig,
      parent,
      args,
      reactiveValidators,
      iterationId
    );
    if (iterationId === propertyConfig.validationIterationId) {
      propertyConfig.reactiveIsValid.value = isAllValid;
      propertyConfig.validatingReactive.value = false;
    }
    return propertyConfig.reactiveIsValid.value;
  });
}
function invokeLazyPropertyValidators(propertyConfig, parent, args, iterationId) {
  return __async(this, null, function* () {
    propertyConfig.validatingLazy.value = true;
    const lazyValidators = propertyConfig.lazyProcessedValidators;
    const isAllValid = yield invokeAndOptimizeValidators(
      propertyConfig,
      parent,
      args,
      lazyValidators,
      iterationId
    );
    if (iterationId === propertyConfig.validationIterationId) {
      propertyConfig.lazyIsValid.value = isAllValid;
      propertyConfig.validatingLazy.value = false;
    }
    return propertyConfig.lazyIsValid.value;
  });
}
function invokeValidatorConfigs(validationConfigs, parent, args, reactive3, lazy) {
  return __async(this, null, function* () {
    const validatorPromises = [];
    for (const validationConfig of validationConfigs) {
      const iterationId = ++validationConfig.validationIterationId;
      if (reactive3 && validationConfig.validation.$reactive !== void 0) {
        validatorPromises.push(invokeReactivePropertyValidators(validationConfig, parent.value, args, iterationId));
      }
      if (lazy && validationConfig.validation.$lazy !== void 0) {
        validatorPromises.push(invokeLazyPropertyValidators(validationConfig, parent.value, args, iterationId));
      }
      if (validationConfig.elementValidation !== void 0) {
        console.time("Assembling array");
        const elementValidationConfigs = [];
        for (const key in validationConfig.arrayConfigMap) {
          elementValidationConfigs.push(...validationConfig.arrayConfigMap[key].validationConfigs);
        }
        console.timeEnd("Assembling array");
        validatorPromises.push(invokeValidatorConfigs(elementValidationConfigs, parent, args, reactive3, lazy));
      }
    }
    return Promise.all(validatorPromises).then((response) => response.every((x) => x === true));
  });
}

// src/useValidation.ts
function useValidation(validationConfig) {
  var _a;
  (_a = validationConfig.delayReactiveValidation) != null ? _a : validationConfig.delayReactiveValidation = true;
  const { objectToValidate: object, validation, delayReactiveValidation, args } = validationConfig;
  const hasValidated = (0, import_vue3.ref)(false);
  const isValidating = (0, import_vue3.computed)(() => validationConfigs.some((x) => x.validationState.isValidating));
  const isValid = (0, import_vue3.computed)(() => {
    const allValidatorsValid = validationConfigs.every((x) => x.reactiveIsValid.value && x.lazyIsValid.value);
    return allValidatorsValid;
  });
  let validationConfigs = [];
  let propertyState = (0, import_vue3.reactive)({});
  const dirtyReference = (0, import_vue3.ref)(JSON.stringify(validationConfig.objectToValidate.value));
  const isDirty = (0, import_vue3.computed)(() => dirtyReference.value !== JSON.stringify(validationConfig.objectToValidate.value));
  const isPrimitiveOrArray = (validation == null ? void 0 : validation.$reactive) != void 0 || (validation == null ? void 0 : validation.$lazy) != void 0 || (validation == null ? void 0 : validation.$each) != void 0;
  if (isPrimitiveOrArray) {
    const typedValidation = validation;
    const typedObject = object;
    const validatedPropertyConfig = configureValidationOnProperty(typedObject, typedValidation);
    propertyState = (0, import_vue3.reactive)(validatedPropertyConfig.validationState);
    validationConfigs = [validatedPropertyConfig];
  } else {
    const typedObject = object;
    const typedValidation = validation;
    const validationSetup = setupNestedPropertiesForValidation(typedObject.value, typedValidation);
    propertyState = (0, import_vue3.reactive)(validationSetup.state);
    validationConfigs = validationSetup.validationConfigs;
  }
  (0, import_vue3.watch)(
    validationConfig.objectToValidate,
    () => {
      if (delayReactiveValidation) {
        if (hasValidated.value == true) {
          invokeValidatorConfigs(validationConfigs, object, args, true, false);
        }
      } else {
        console.time("Reactive validation");
        invokeValidatorConfigs(validationConfigs, object, args, true, false);
        console.timeEnd("Reactive validation");
      }
    },
    { deep: true }
  );
  function validate() {
    return __async(this, null, function* () {
      const isValid2 = yield invokeValidatorConfigs(validationConfigs, object, args, true, true);
      hasValidated.value = true;
      return isValid2;
    });
  }
  function setReference(reference) {
    dirtyReference.value = JSON.stringify(reference);
  }
  return (0, import_vue3.reactive)({
    hasValidated,
    validate,
    isValidating,
    propertyState: (0, import_vue3.computed)(() => propertyState),
    isValid,
    setReference,
    isDirty
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bufferAsync,
  isEmailSync,
  maximumLength,
  minValue,
  minimumLength,
  required,
  throttleQueueAsync,
  useValidation,
  validateIf
});
