main();

const htmlBackgroundColor = document.querySelector('#background-color');

const parseColor = (hexColor) => {
    const colorMaxValue = 255;

    const red = parseInt(hexColor.slice(1, 3), 16) / colorMaxValue;
    const green = parseInt(hexColor.slice(3, 5), 16) / colorMaxValue;
    const blue = parseInt(hexColor.slice(5, 7), 16) / colorMaxValue;
    console.log(red, green, blue);

    return [red, green, blue];
}

htmlBackgroundColor.addEventListener('change', (e) => {
    const target = e.target;
    const [r, g, b] = parseColor(target.value);
    backgroundColor[0] = r;
    backgroundColor[1] = g;
    backgroundColor[2] = b;
});

const updateLightSource = (id, value) => {
    const index = parseInt(id[1]) - 1;
    let sourceIndex = 0;

    switch (id[0]) {
        case 'x':
            sourceIndex = 3 * index + 0;
            directedLight.source[sourceIndex] = value;
            break;
        case 'y':
            sourceIndex = 3 * index + 1;
            directedLight.source[sourceIndex] = value;
            break;
        case 'z':
            sourceIndex = 3 * index + 2;
            directedLight.source[sourceIndex] = value;
            break;
        case 'c':
            sourceIndex = 3 * index;
            const [r, g, b] = parseColor(value);
            console.log(value);
            directedLight.color[sourceIndex] = r;
            directedLight.color[sourceIndex + 1] = g;
            directedLight.color[sourceIndex + 2] = b;
            break;
    }
}

const options = document.querySelectorAll('.option');

for (const option of options) {
    option.addEventListener('change', (e) => {
        const target = e.target;
        const id = target.id;
        const value = target.value;
        updateLightSource(id, value);
    })
}

let currentObjectIndex = 1;

const translateX = document.querySelector('#tx');
const translateY = document.querySelector('#ty');
const translateZ = document.querySelector('#tz');
const rotateX = document.querySelector('#rx');
const rotateY = document.querySelector('#ry');
const rotateZ = document.querySelector('#rz');
const scaleX = document.querySelector('#sx');
const scaleY = document.querySelector('#sy');
const scaleZ = document.querySelector('#sz');
const shearAx = document.querySelector('#shx');
const shearLambda = document.querySelector('#shc');
const shading = document.querySelector('#shading');
const ambient = document.querySelector('#ambient');
const diffuse = document.querySelector('#diffuse');
const specular = document.querySelector('#specular');
const shininess = document.querySelector('#shininess');

translateX.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 10;
    objectInfo[currentObjectIndex].translate[0] = value;
});

translateY.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 10;
    objectInfo[currentObjectIndex].translate[1] = value;
});

translateZ.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 10;
    objectInfo[currentObjectIndex].translate[2] = value;
});

rotateX.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 100;
    objectInfo[currentObjectIndex].rotation.rotationAxis[0] = value;
});

rotateY.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 100;
    objectInfo[currentObjectIndex].rotation.rotationAxis[1] = value;
});

rotateZ.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 100;
    objectInfo[currentObjectIndex].rotation.rotationAxis[2] = value;
});

scaleX.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 50;
    objectInfo[currentObjectIndex].scale[0] = value;
});

scaleY.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 50;
    objectInfo[currentObjectIndex].scale[1] = value;
});

scaleZ.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value / 50;
    objectInfo[currentObjectIndex].scale[2] = value;
});

shearLambda.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;
    objectInfo[currentObjectIndex].shear.lambda = value;
});

shearAx.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;

    const axisArray = [0, 0, 0];
    
    switch (value) {
        case 'x':
            axisArray[0] = 1;
            break;
        case 'y':
            axisArray[1] = 1;
            break;
        case 'z':
            axisArray[2] = 1;
            break;
    }

    objectInfo[currentObjectIndex].shear.shearAxis = axisArray;
});

shading.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;
    let program = null;

    switch (value) {
        case 'flat':
            program = flatProgram;
            break;
        case 'gouraud':
            program = gouraudProgram;
            break;
        case 'phong':
            program = phongProgram;
            break;
    }

    objectInfo[currentObjectIndex].programInfo = program;
});

ambient.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;
    objectInfo[currentObjectIndex].Ka = value / 20;
});

diffuse.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;
    objectInfo[currentObjectIndex].Kd = value / 20;
});

specular.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;
    objectInfo[currentObjectIndex].Ks = value / 20;
});

shininess.addEventListener('change', (e) => {
    const target = e.target;
    const value = target.value;
    objectInfo[currentObjectIndex].shininess = value;
});

const loadTranslation = (index) => {
    const [x, y, z] = objectInfo[index].translate;
    translateX.value = x * 10;
    translateY.value = y * 10;
    translateZ.value = z * 10;
}

const loadRotation = (index) => {
    const [x, y, z] = objectInfo[index].rotation.rotationAxis;
    rotateX.value = x * 100;
    rotateY.value = y * 100;
    rotateZ.value = z * 100;
}

const loadScale = (index) => {
    const [x, y, z] = objectInfo[index].scale;
    scaleX.value = x * 50;
    scaleY.value = y * 50;
    scaleZ.value = z * 50;
}

const loadShear = (index) => {
    const { lambda, shearAxis } = objectInfo[index].shear;
    shearLambda.value = lambda;
    if (shearAxis[0]) {
        shearAx.value = 'x';
    } else if (shearAxis[1]) {
        shearAx.value = 'y';
    } else {
        shearAx.value = 'z';
    }
}

const loadShading = (index) => {
    const shader = objectInfo[index].programInfo;
    if (shader === flatProgram) {
        shading.value = 'flat';
    } else if (shader === gouraudProgram) {
        shading.value = 'gouraud';
    } else if (shader === phongProgram) {
        shading.value = 'phong';
    }
}

const loadLighting = (index) => {
    const Ka = objectInfo[index].Ka;
    const Kd = objectInfo[index].Kd;
    const Ks = objectInfo[index].Ks;
    const shiny = objectInfo[index].shininess;

    ambient.value = Ka * 20;
    diffuse.value = Kd * 20;
    specular.value = Ks * 20;
    shininess.value = shiny;
}

const htmlObject = document.querySelector('#obj');

htmlObject.addEventListener('change', (e) => {
    const target = e.target;
    const options = target.options;
    const index = parseInt(options[options.selectedIndex].id.slice(3, 4)) - 1;
    currentObjectIndex = index;

    loadTranslation(index);
    loadShading(index);
    loadRotation(index);
    loadShear(index);
    loadScale(index);
    loadLighting(index);
});