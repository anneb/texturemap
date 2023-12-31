import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import {colors} from './colors.js';

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();

// global variables
let triangles = [];
let textures = [];
let polygons = [];
let image = null;

const baseName = 'maquette_krimpen_cc_21-537684-346784';

const scaleElement = document.querySelector('#scale');
const maxAngleElement = document.querySelector('#maxangle');
const showTrianglesElement = document.querySelector('#showtriangles');
const showPolygonsElement = document.querySelector('#showpolygons');
const canvasElement = document.querySelector('#canvas');

let scale = scaleElement.value;
let angle = maxAngleElement.value;
let showTriangles = showTrianglesElement.checked;
let showPolygons = showPolygonsElement.checked;
scaleElement.addEventListener('change', e => {scale = e.target.value; drawPage()});
maxAngleElement.addEventListener('change', e => {angle = e.target.value; drawPage()});
showTrianglesElement.addEventListener('change', e => {showTriangles = e.target.checked; drawPage()});
showPolygonsElement.addEventListener('change', e => {showPolygons = e.target.checked; drawPage()});
canvasElement.addEventListener('click', e => {
    // get coordinates of click
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = canvasElement.width;
    const h = canvasElement.height;
    const uv = new THREE.Vector2(x / w, 1 - y / h);
    const triangle = findTriangle(uv);
    const polygon = findPolygon(uv);
    if (polygon !== -1) {
        clipPolygon(polygons[polygon]);
    }
    updateStatus(`Triangle: ${triangle}<br>Polygon: ${polygon}`);
});

// wait promise
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function clipPolygon(polygon) {
    // get canvas
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    context.save();
    context.clearRect(0,0,canvas.width,canvas.height);
    context.beginPath();
    let minx = polygon[0].x;
    let maxx = minx;
    let miny = polygon[0].y;
    let maxy = miny;
    context.moveTo(polygon[0].x * canvas.width, (1 - polygon[0].y) * canvas.height);
    for (let i = 1; i < polygon.length; i++) {
        context.lineTo(polygon[i].x * canvas.width, (1 - polygon[i].y) * canvas.height);
        minx = Math.min(minx, polygon[i].x);
        maxx = Math.max(maxx, polygon[i].x);
        miny = Math.min(miny, polygon[i].y);
        maxy = Math.max(maxy, polygon[i].y);
    }
    context.closePath();
    context.clip();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const tempcanvas = document.createElement('canvas');
    const tempcontext = tempcanvas.getContext('2d');
    const tempwidth = (maxx - minx) * canvas.width;
    const tempheight = (maxy - miny) * canvas.height;
    tempcontext.width = tempwidth;
    tempcontext.height = tempheight;
    tempcontext.drawImage(canvas, minx * canvas.width, (1 - maxy) * canvas.height, tempwidth, tempheight, 0, 0, tempwidth, tempheight);
    const docImage = document.querySelector('#image');
    docImage.src = tempcanvas.toDataURL();
    context.restore();
    drawPage();
}

function pointInTriangle(p, a, b, c) {
    // Compute vectors
    let v0 = c.clone().sub(a);
    let v1 = b.clone().sub(a);
    let v2 = p.clone().sub(a);

    // Compute dot products
    let dot00 = v0.dot(v0);
    let dot01 = v0.dot(v1);
    let dot02 = v0.dot(v2);
    let dot11 = v1.dot(v1);
    let dot12 = v1.dot(v2);

    // Compute barycentric coordinates
    let invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    let u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    let v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    // Check if point is in triangle
    return (u >= 0) && (v >= 0) && (u + v < 1);
}

function findTriangle(uv) {
    for (let i = 0; i < textures.length; i++) {
        // texture is an array of 3 uv coordinates
        const texture = textures[i];
        const uvA = texture[0];
        const uvB = texture[1];
        const uvC = texture[2];
        // check if uv is inside triangle
        if (pointInTriangle(uv, uvA, uvB, uvC)) {
            return i;
        }
    }
    return -1;
}

function pointInPolygon(polygon, testPoint) {
    let i, j, c = false;
    for (i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i].y > testPoint.y) != (polygon[j].y > testPoint.y)) &&
            (testPoint.x < (polygon[j].x - polygon[i].x) * (testPoint.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
            c = !c;
        }
    }
    return c;
}

function findPolygon(uv) {
    for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        if (pointInPolygon(polygon, uv)) {
            return i;
        }
    }
    return -1;
}

function drawPage() {
    triangles = [];
    textures = [];
    const scene = new THREE.Scene();
    document.querySelector('#info').innerHTML = `Loading...`;
    mtlLoader.load(`data/${baseName}.mtl`, materials => {
        materials.preload();
        objLoader.setMaterials(materials);
        objLoader.load(`data/${baseName}.obj`, object => {
            scene.add(object);
            scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    // Access to vertices
                    const vertices = child.geometry.attributes.position.array;
                    const uvArray = child.geometry.attributes.uv.array // grab the uv array from the geometry
                    triangles = [];
                    
                    if (child.geometry.index !== null) {
                        // Indexed BufferGeometry
                        const indices = child.geometry.index.array;
                
                        for (let i = 0; i < indices.length; i += 3) {
                            let aIndex = indices[i] * 3;
                            let bIndex = indices[i+1] * 3;
                            let cIndex = indices[i+2] * 3;

                            // Create THREE.Vector3 vertices
                            let a = new THREE.Vector3(vertices[aIndex], vertices[aIndex+1], vertices[aIndex+2]);
                            let b = new THREE.Vector3(vertices[bIndex], vertices[bIndex+1], vertices[bIndex+2]);
                            let c = new THREE.Vector3(vertices[cIndex], vertices[cIndex+1], vertices[cIndex+2]);

                            // If the mesh has any transformations applied, you'll need to apply them to the vertices as well.
                            if (child.matrixWorld) {
                                a.applyMatrix4(child.matrixWorld);
                                b.applyMatrix4(child.matrixWorld);
                                c.applyMatrix4(child.matrixWorld);
                            }

                            // Create a THREE.Triangle from the vertices
                            let triangle = new THREE.Triangle(a, b, c);

                            // Add the triangle to the triangles array
                            triangles.push(triangle);

                            // Get the indices of the uvs of the face
                            let aUVIndex = indices[i] * 2;
                            let bUVIndex = indices[i+1] * 2;
                            let cUVIndex = indices[i+2] * 2;

                            if (uvArray) {
                                // Create UV coordinates
                                let aUV = new THREE.Vector2(uvArray[aUVIndex], uvArray[aUVIndex + 1]);
                                let bUV = new THREE.Vector2(uvArray[bUVIndex], uvArray[bUVIndex + 1]);
                                let cUV = new THREE.Vector2(uvArray[cUVIndex], uvArray[cUVIndex + 1]);

                                // Add the uv coordinates to the uvs array
                                textures.push([aUV, bUV, cUV]);
                            }
                        }
                    } else {
                        // Non-indexed BufferGeometry
                        for (let i = 0; i < vertices.length; i += 9) {
                            // Create THREE.Vector3 vertices directly from the positions array
                            let a = new THREE.Vector3(vertices[i], vertices[i+1], vertices[i+2]);
                            let b = new THREE.Vector3(vertices[i+3], vertices[i+4], vertices[i+5]);
                            let c = new THREE.Vector3(vertices[i+6], vertices[i+7], vertices[i+8]);

                            // If the mesh has any transformations applied, you'll need to apply them to the vertices as well.
                            if (child.matrixWorld) {
                                a.applyMatrix4(child.matrixWorld);
                                b.applyMatrix4(child.matrixWorld);
                                c.applyMatrix4(child.matrixWorld);
                            }

                            // Create a THREE.Triangle from the vertices
                            let triangle = new THREE.Triangle(a, b, c);

                            // Add the triangle to the triangles array
                            triangles.push(triangle);

                            if (uvArray) {
                                // Get the uvs for the face
                                let aUV = new THREE.Vector2(uvArray[i/3*2], uvArray[i/3*2 + 1]);
                                let bUV = new THREE.Vector2(uvArray[i/3*2 + 2], uvArray[i/3*2 + 3]);
                                let cUV = new THREE.Vector2(uvArray[i/3*2 + 4], uvArray[i/3*2 + 5]);

                                // Add the uv coordinates to the uvs array
                                textures.push([aUV, bUV, cUV]);
                            }
                        }
                    }
                    clusterize(triangles);
                }
            });
        });
    });
}

function intersect(a, b) {
    let setB = new Set(b);
    return [...new Set(a)].filter(x => setB.has(x));
}

function createVerticesToTrianglesMap(triangles) {
    // 1. Create an empty Map.
    let vertexToTrianglesMap = new Map();

    // 2. Populate the map.
    for (let i = 0; i < triangles.length; i++) {
        let triangle = triangles[i];

        // We convert the vertices to strings to use as keys in the Map.
        let vertices = [triangle.a, triangle.b, triangle.c].map(v => `${v.x},${v.y},${v.z}`);

        for (let vertex of vertices) {
            if (vertexToTrianglesMap.has(vertex)) {
                vertexToTrianglesMap.get(vertex).push(i);
            } else {
                vertexToTrianglesMap.set(vertex, [i]);
            }
        }
    }
    return vertexToTrianglesMap;
}

function createAdjacencyMap(vertexToTrianglesMap) {
    // Convert Map to an array and sort it by vertex values
    const sortedVertices = Array.from(vertexToTrianglesMap.entries());//.sort();

    // Empty adjacency map
    const adjacencyMap = new Map();

    // Iterate over the sorted array
    for (let i = 0; i < sortedVertices.length; i++) {
        let [vertex, triangles1] = sortedVertices[i];

        // Start from the next vertex to avoid duplicate calculations
        for (let j = i + 1; j < sortedVertices.length; j++) {
            let [vertex2, triangles2] = sortedVertices[j];

            // Find the intersecting triangles
            let intersectingTriangles = intersect(triangles1, triangles2);
            if (intersectingTriangles.length > 0) {
                // Add the intersecting triangles to the adjacency map
                intersectingTriangles.forEach(triangleIndex => {
                    const adjacentTriangles = intersectingTriangles.filter(i => i !== triangleIndex);
                    if (adjacencyMap.has(triangleIndex)) {
                        if (adjacentTriangles.length > 0) {
                            adjacencyMap.get(triangleIndex).add(...adjacentTriangles);
                        }
                    } else {
                        adjacencyMap.set(triangleIndex, new Set(adjacentTriangles));
                    }
                });
            }
        }
    }
    return adjacencyMap;
}

function areAdjacent(triangle1, triangle2) {
    // Convert triangle vertices to strings for comparison
    let triangle1Vertices = triangle1.map(vertex => JSON.stringify(vertex));
    let triangle2Vertices = triangle2.map(vertex => JSON.stringify(vertex));
    
    // Count the number of vertices the triangles share
    let sharedVertices = triangle1Vertices.filter(vertex => triangle2Vertices.includes(vertex));

    // If they share two vertices, they are adjacent
    return sharedVertices.length === 2;
}

/* group triangles
    by adjacency of triangles
    and by adjacent triangle normals within a threshold
    and by adjacency of uvs
*/
function groupByAdjencyAndNormals(adjacencyMap) {
    // Calculate the normals for each triangle
    const normals = triangles.map(triangle => {
        const normal = new THREE.Vector3();
        triangle.getNormal(normal);
        return normal;
    });
    
    // The threshold angle in degrees
    let angleThreshold = angle; 
    
    // Convert the threshold to radians since THREE.js uses radians
    let angleThresholdRadians = angleThreshold * Math.PI / 180;

    // Modified depth-first search
    function dfs(node, visited) {
        if (!visited.has(node)) {
            visited.add(node);
            let neighbours = adjacencyMap.get(node);
            neighbours.forEach(neighbour => {
                // Only continue exploring if the angle between normals is below the threshold
                if (normals[node].angleTo(normals[neighbour]) < angleThresholdRadians) {
                    if (areAdjacent(textures[node], textures[neighbour])) {
                        dfs(neighbour, visited);
                    }
                }
            });
        }
    }

    // Find connected components in the graph
    let visited = new Set();
    let components = [];
    
    for (let [triangleIndex, adjacentTriangles] of adjacencyMap) {
        if (!visited.has(triangleIndex)) {
            let component = new Set();
            dfs(triangleIndex, component);
            components.push(Array.from(component)); // Convert set to array for simplicity
            component.forEach(node => visited.add(node));
        }
    }
    return components;
}

function detriangulate(triangles) {
    function minus (a, b) {
        return {x: a.x - b.x, y: a.y - b.y};
    }
    const edges = [];
    // add edges in counter clockwise order
    for (let triangle of triangles) {
        const a = triangle[0];
        const b = triangle[1];
        const c = triangle[2];
        const AB = minus(b, a);
        const AC = minus(c, a);
        if (AB.x * AC.y - AB.y * AC.x  > 0) {
            edges.push([a, b]);
            edges.push([b, c]);
            edges.push([c, a]);
        } else {
            edges.push([a, c]);
            edges.push([c, b]);
            edges.push([b, a]);
        }
    }
    const borderEdges = [];
    for (const edge of edges) {
        const a = edge[0];
        const b = edge[1];
        if (!edges.find((edge)=>edge[0].x === b.x && edge[0].y === b.y && edge[1].x === a.x && edge[1].y === a.y)) {
            borderEdges.push(edge);
        }
    }
    const polygon = [];
    const first = borderEdges[0][0];
    let last = borderEdges[0][1];
    polygon.push(first);
    while (last.x !== first.x || last.y !== first.y) {
        polygon.push(last);
        let lastFound = false;
        for (const edge of borderEdges) {
            if (edge[0].x === last.x && edge[0].y === last.y) {
                last = edge[1];
                lastFound = true;
                break;
            }
        }
        if (!lastFound) {
            console.log('last not found');
        }
    }
    return polygon;
}


function buildPolygons(connectedComponents) {
    polygons = [];

    //connectedComponents = connectedComponents.filter(component=>component.includes(371)); // debug
    for (let component of connectedComponents) {
        // Convert the set of triangle indices into an array
        let triangleIndices = Array.from(component);
        if (triangleIndices.length === 0) {
            continue;
        }
        const polygon = detriangulate(triangleIndices.map(i => textures[i]));
        polygons.push(polygon);
    }
    return polygons;
}

function drawPolygons(polygons) {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    let colorIndex = 6;

    const w = canvas.width;
    const h = canvas.height;

    for (const polygon of polygons) {
        context.beginPath();
        context.moveTo(polygon[0].x * w, (1 - polygon[0].y) * h);
        for (let i = 1; i < polygon.length; i++) {
            context.lineTo(polygon[i].x * w, (1 - polygon[i].y) * h);
        }
        context.closePath();
        context.strokeStyle = colors[colorIndex++ % colors.length];
        context.stroke();
    }
}

function updateStatus(message) {
        // Update the content
        document.querySelector('#info').innerHTML = message;
    
        // Pause execution and allow the browser to redraw
        return new Promise(resolve => setTimeout(resolve, 0));
}

async function clusterize(triangles) {
    await updateStatus(`Indexing...`);
    const vertexToTrianglesMap = createVerticesToTrianglesMap(triangles);
    await updateStatus(`Adjacencies...`);
    const adjacencyMap = createAdjacencyMap(vertexToTrianglesMap);
    await updateStatus(`Clustering...`);
    const components = groupByAdjencyAndNormals(adjacencyMap);
    await updateStatus(`Untriangulating...`);
    const polygons = buildPolygons(components);
    await updateStatus(`Drawing...`);
    drawUvsOnTexture(textures, polygons);
    await updateStatus(``);
}


const textureLoader = new THREE.TextureLoader();

function drawUvsOnTexture(textures, polygons) {
    textureLoader.load(`data/texture_0.jpeg`, texture => {
        //const canvas = document.createElement('canvas');
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        image = texture.image;
        
        canvas.width = texture.image.width * scale;
        canvas.height = texture.image.height * scale;
        
        context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
        
        //const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // draw the uv triangles
        if (showTriangles) {
            for (let i = 0; i < textures.length; i++) {
                const uvA = textures[i][0];
                const uvB = textures[i][1];
                const uvC = textures[i][2];
            
                const a = new THREE.Vector2(uvA.x * canvas.width, (1 - uvA.y) * canvas.height);
                const b = new THREE.Vector2(uvB.x * canvas.width, (1 - uvB.y) * canvas.height);
                const c = new THREE.Vector2(uvC.x * canvas.width, (1 - uvC.y) * canvas.height);
            
                context.beginPath();
                context.moveTo(a.x, a.y);
                context.lineTo(b.x, b.y);
                context.lineTo(c.x, c.y);
                context.closePath();
                context.strokeStyle = '#C0C0C0';
                context.stroke();
            }
        }
        if (showPolygons) {
            drawPolygons(polygons);
        }
    });
}

drawPage()