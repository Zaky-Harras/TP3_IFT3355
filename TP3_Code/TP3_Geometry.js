
class Node {
	constructor(parentNode) {
		this.parentNode = parentNode; //Noeud parent
		this.childNode = []; //Noeud enfants

		this.p0 = null; //Position de depart de la branche
		this.p1 = null; //Position finale de la branche

		this.a0 = null; //Rayon de la branche a p0
		this.a1 = null; //Rayon de la branche a p1

		this.sections = null; //Liste contenant une liste de points representant les segments circulaires du cylindre generalise

		this.hasLeafs;
		this.hasApple;
		this.tranformationMatrix = null;
		this.f32TrunkSize = null;
		this.f32LeafSize = null;
		this.f32AppleSize = null;
	}
	set hasApple(bool){
		this._hasApple = bool;
	}
	get hasApple(){
		return this._hasApple;
	}

	set hasLeafs(bool){
		this._hasLeafs = bool;
	}

	get hasLeafs(){
		return this._hasLeafs;
	}
}

TP3.Geometry = {

	simplifySkeleton: function (rootNode, rotationThreshold = 0.0001) {
		function calculateAngle(v1, v2) {
			const dotProduct = v1.dot(v2);
			const magnitude = v1.length() * v2.length();
			return Math.acos(Math.min(Math.max(dotProduct / magnitude, -1), 1));
		}

		// Fonction recursive
		function simplifyNode(node) {
			if (!node) return null;

			// verification pour childNode
			if (!Array.isArray(node.childNode)) {
				return node;
			}

			// simplification des enfants
			for (let i = 0; i < node.childNode.length; i++) {
				node.childNode[i] = simplifyNode(node.childNode[i]);
			}

			// Si a noeud peut etre colore (rouge)
			if (node.childNode.length === 1) {
				const child = node.childNode[0];
				if (!node.p0 || !node.p1 || !child.p0 || !child.p1) {
					return node;
				}

				const parentVector = new THREE.Vector3().subVectors(node.p1, node.p0);
				const childVector = new THREE.Vector3().subVectors(child.p1, node.p1);

				if (parentVector.length() === 0 || childVector.length() === 0) {
					return node;
				}

				const angle = calculateAngle(parentVector.normalize(), childVector.normalize());
				if (angle < rotationThreshold) {
					child.p0 = node.p0;
					child.a0 = node.a0;
					if(node === rootNode){
						node.p1 = node.p0;
					}
					return child;
				}
			}

			return node;
		}

		return simplifyNode(rootNode);

	},

	generateSegmentsHermite: function (rootNode, lengthDivisions = 4, radialDivisions = 8) {
		let vertexIndexCounter = 0; // Counter pour les indices des sommets
	
		function generateRadialPoints(center, normal, radius, radialDivisions) {
			const radialPoints = [];
			const tangent = new THREE.Vector3(-normal.y, normal.x, 0).normalize(); // Perpendicular vector
			const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
	
			for (let i = 0; i < radialDivisions; ++i) {
				const angle = (2.0 * Math.PI * i) / radialDivisions;
				const offset = tangent.clone().multiplyScalar(Math.cos(angle))
					.add(bitangent.clone().multiplyScalar(Math.sin(angle)))
					.multiplyScalar(radius);
				radialPoints.push(center.clone().add(offset));
			}
			return radialPoints;
		}
	
		function computeSections(node, lengthDivisions, radialDivisions) {
			const sections = [];
			const vertexIndices = []; // Pour garder les indices
			const p0 = node.p0.clone();
			const p1 = node.p1.clone();
			const v0 = p1.clone().sub(p0);
			const v1 = node.parentNode ? node.parentNode.p1.clone().sub(node.parentNode.p0) : v0;
	
			for (let i = 0; i <= lengthDivisions; ++i) {
				const t = i / lengthDivisions;
				const [position, tangent] = TP3.Geometry.hermite(p0, p1, v0, v1, t);
	
				const radius = node.a0 + t * (node.a1 - node.a0); // Interpolating radius
				const radialPoints = generateRadialPoints(position, tangent, radius, radialDivisions);
	
				const indicesForCurrentSection = [];
				radialPoints.forEach(() => {
					indicesForCurrentSection.push(vertexIndexCounter++);
				});
	
				vertexIndices.push(indicesForCurrentSection);
				sections.push(radialPoints);
			}
	
			node.vertexIndices = vertexIndices;
			return sections;
		}
	
		function traverseNode(node) {
			if (!node) return;
	
			node.sections = computeSections(node, lengthDivisions, radialDivisions);
	
			for (const child of node.childNode) {
				traverseNode(child);
			}
		}
	
		traverseNode(rootNode);
	},

	hermite: function (h0, h1, v0, v1, t) {
		// derivee de parametres de Hermite
		const P0 = h0.clone();
		const P1 = h0.clone().add(v0.clone().multiplyScalar(1 / 3));
		const P2 = h1.clone().add(v1.clone().multiplyScalar(-1 / 3));
		const P3 = h1.clone();
	
		// De Casteljau Algorithm pour les courbes de Bezier
		const lerp = (a, b, t) => a.clone().multiplyScalar(1 - t).add(b.clone().multiplyScalar(t));
	
		// 1ere interpolation
		const Q0 = lerp(P0, P1, t);
		const Q1 = lerp(P1, P2, t);
		const Q2 = lerp(P2, P3, t);
	
		// 2eme interpolation
		const R0 = lerp(Q0, Q1, t);
		const R1 = lerp(Q1, Q2, t);
	
		// interpolation finale
		const p = lerp(R0, R1, t);
	
		// Tangent vector
		const dp = R1.clone().sub(R0).normalize();
	
		return [p, dp];
	},


	// Trouver l'axe et l'angle de rotation entre deux vecteurs
	findRotation: function (a, b) {
		const axis = new THREE.Vector3().crossVectors(a, b).normalize();
		var c = a.dot(b) / (a.length() * b.length());

		if (c < -1) {
			c = -1;
		} else if (c > 1) {
			c = 1;
		}

		const angle = Math.acos(c);

		return [axis, angle];
	},

	// Projeter un vecter a sur b
	project: function (a, b) {
		return b.clone().multiplyScalar(a.dot(b) / (b.lengthSq()));
	},

	// Trouver le vecteur moyen d'une liste de vecteurs
	meanPoint: function (points) {
		var mp = new THREE.Vector3();

		for (var i = 0; i < points.length; i++) {
			mp.add(points[i]);
		}

		return mp.divideScalar(points.length);
	},
};
