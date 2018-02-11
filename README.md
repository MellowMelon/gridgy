# gridgy

Provide a description of a tesselation. Get back methods for hit testing and
incidence relationships.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html)

This is useful for implementing interactive tools or games on grids, especially
if the grid is irregular or customizable. While the module will not solve all
of your problems, it will provide a nice foundation for solving the more
tedious ones, particularly mouse detection.

If your desired tesselation is a common one, you should look over
[gridgy-presets](https://github.com/MellowMelon/gridgy-presets), which provides some
common instances and factories for the classes in this module.

## What kind of name is gridgy?

An abbreviation of grid geometry. It's mostly in honor of an excellently named
file in a private codebase I work on.

# Install

With [npm](http://npmjs.org) installed, run

```
npm install gridgy
```

UMD builds made with rollup are available in the dist directory.

# Example

A very minimal sample of code showing how this module can help implement an
interactive tic-tac-toe game:

``` js
import {Tesselation, Grid} from "gridgy";

const tessSquare = new Tesselation({
  vertexCoordinatesTable: {"0": [0, 0]},
  faceVerticesTable: {
    "0": [[0, 0, "0"], [1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
  },
  periodMatrix: [1, 0, 0, 1],
});

const ticTacToeGrid = new Grid({
  tesselation: tessSquare,
  faceList: [
    [0, 0, "0"], [1, 0, "0"], [2, 0, "0"],
    [0, 1, "0"], [1, 1, "0"], [2, 1, "0"],
    [0, 2, "0"], [1, 2, "0"], [2, 2, "0"],
  ],
});

// Or you can use the gridgy-presets module and be ready in two lines:
// import {square} from "gridgy-presets";
// const ticTacToeGrid = square({width: 3, height: 3});

// This function draws the tic-tac-toe gridlines.
// ctx is a Context2D for a Canvas.
function drawGridlines(ctx) {
  ctx.beginPath();
  grid.getEdgeList().forEach(edge => {
    if (grid.isEdgeInside(edge)) {
      const [p1, p2] = grid.getEdgeCoordinates(edge);
      ctx.moveTo(...p1);
      ctx.lineTo(...p2);
    }
  });
  ctx.stroke();
}

// This function determines which cell [x, y] was clicked on.
function findClickedCell(mouseX, mouseY) {
  const face = grid.findFaceAt([mouseX, mouseY]);
  return face ? [face[0], face[1]] : null;
}
```

For a larger example, check the
[demo](https://mellowmelon.github.io/gridgy-presets/index.html) and its
[source](https://github.com/MellowMelon/gridgy-presets/blob/master/demo/demo.js).

# API

gridgy exports two classes: Tesselation and Grid.

``` js
import {Tesselation, Grid} from "gridgy";
// or
var Gridgy = require("gridgy");
var Tesselation = Gridgy.Tesselation;
var Grid = Gridgy.Grid;
```

## Tesselation

A representation of an infinitely repeating pattern of shapes. A tesselation is
made up of faces, edges, and vertices (in the graph theory sense). It
is specified by giving the locations of the vertices, which vertices are on
which faces, and the change in coordinates per period.

Here is how you would create a Tesselation instance for a square grid:
``` js
import {Tesselation} from "gridgy";
const tessSquare = new Tesselation({
  vertexCoordinatesTable: {"0": [0, 0]},
  faceVerticesTable: {
    "0": [[0, 0, "0"], [1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
  },
  periodMatrix: [1, 0, 0, 1],
});
```

From this, the Tesselation instance determines how all the faces, edges, and
vertices are arranged and where they are in the plane. The identifiers (usually
referred to as keys in these docs) for each of these elements are
- faces: `[x, y, face ID]`. Face IDs are the keys of the `faceVerticesTable`
  provided to the constructor, and `x, y` are two integers giving the periodic
  component. Faces are always polygons made of vertices in the tesselation and
  do not support curved boundaries or unbounded regions.
- edges: `[x, y, i, face ID]`. This corresponds to the edge joining vertices
  `i` and `i+1` (0-indexed) of the face `[x, y, face ID]`. Multiple keys
  can refer to the same edge; see getCanonicalEdge for details.
- vertices: `[x, y, vertexID]`. Vertex IDs are the keys of the
  `vertexCoordinatesTable` provided to the constructor, and `x, y` are two
  integers giving the periodic component.

This identifier system will likely be easier to understand by playing around
with the [demo](https://mellowmelon.github.io/gridgy-presets/index.html) with
labels turned on and checking how each face, edge, and vertex is named for
various grids.

Tesselations cache a lot of computations of element-on-element incidence and
hit testing, with the expectation that you will reuse a few Tesselation
instances throughout your code without creating more after your initialization.
These computations are lazy and done the first time they are needed, so e.g.
a Tesselation will only compute a Voronoi diagram of vertices the first time
you call findVertexAt. Constructing a Tesselation and never using it has
basically no cost.

Your application code is more likely to interact with an instance of the Grid
class, which takes a Tesselation instance as a parameter and is designed to be
much easier to work with. While Tesselations contain most of the module's core
logic, they are more like plumbing from a usage perspective.

### new Tesselation(params)

Takes a single object with the following keys, all required:
- `vertexCoordinatesTable`: Maps vertex IDs to their coordinates in the plane
  on which the tesselation resides. Remember that actual vertices are not
  identified by vertex IDs alone but by the triple `[x, y, vertex ID]`. The
  coordinates here are for `[0, 0, vertex ID]`; the coordinates of `[x, y,
  vertex ID]` are derived using the periodMatrix.
- `faceVerticesTable`: Maps face IDs to the list of vertices on the face with
  period component `0, 0`. The vertices on face `[x, y, face ID]` are obtained
  by adding `x, y` to the period component of each vertex listed in this table.
- `periodMatrix`: An array of four numbers, `[a, b, c, d]`. If the vertex
  `[0, 0, v]` has coordinates `[vx, vy]`, then the vertex `[px, py, v]` has
  coordinates `[vx + px * a + py * c, vy + px * b + py * d]`.

After construction, these three properties are available as
`this.faceVerticesTable`, `this.vertexCoordinatesTable`, and
`this.periodMatrix`, although you are unlikely to need them. You should not
mutate these properties.

### Tesselation#getProps()

Returns a shallow copy of the object passed to the constructor.

### Tesselation#getCanonicalEdge(edge)

Returns the canonical key for the edge. If an invalid or nonexistent
edge is provided, the method may return nonsense or throw.

``` js
tessSquare.getCanonicalEdge([0, 0, 2, "0"]); // -> [0, 1, 0, "0"]
tessSquare.getCanonicalEdge([0, 1, 0, "0"]); // -> [0, 1, 0, "0"]
```

Edges are not directly specified in the constructor, and are instead inferred
by taking the pairs of consecutive vertices in each face. An edge is identified
by `[x, y, i, face ID]`, where `i` and `i+1` are the zero-indexed indices of
the vertices on face `[x, y, face ID]` that the edge joins. (If vertex `i` is
the last vertex, then vertex `i+1` is the first one.) This means in a typical
tesselation, two keys point to the same edge.

Take the square tesselation as an example:
``` js
import {Tesselation} from "gridgy";
const tessSquare = new Tesselation({
  vertexCoordinatesTable: {"0": [0, 0]},
  faceVerticesTable: {
    "0": [[0, 0, "0"], [1, 0, "0"], [1, 1, "0"], [0, 1, "0"]],
  },
  periodMatrix: [1, 0, 0, 1],
});
```
The bottom edge of face `[0, 0, "0"]` is given by `[0, 0, 2, "0"]`. This is
also the top edge of the face below, `[0, 1, "0"]`, so this means that both
`[0, 0, 2, "0"]` and `[0, 1, 0, "0"]` refer to the same edge. The Tesselation
will accept both as inputs, but only one, the "canonical" key, will ever
be used as an output. This method can be used to determine what that canonical
key is.

The choice of canonical key is made deterministically based on the
unordered pair of edge keys.

### Tesselation#isSameEdge(e1, e2)

Returns true if both edges have the same canonical key, false otherwise.

``` js
tessSquare.isSameEdge([0, 0, 2, "0"], [0, 1, 0, "0"]); // -> true
tessSquare.isSameEdge([0, 0, 2, "0"], [0, 0, 2, "0"]); // -> true
tessSquare.isSameEdge([0, 0, 2, "0"], [1, 0, 0, "0"]); // -> false
```

### Tesselation#getEdgesOnFace(face)

Returns an array of edges on the given face. The edges are given in
order, with the ith edge joining the ith and (i+1)th vertices.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:fe)

### Tesselation#getVerticesOnFace(face)

Returns an array of vertices on the given face. The vertices are in
the same order as provided in the constructor.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:fv)

### Tesselation#getFacesOnEdge(edge)

Returns the array of faces on the given edge. There are always at
most 2, and they are in arbitary but consistent order.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:ef)

### Tesselation#getVerticesOnEdge(edge)

Returns the array of vertices on the given edge. There are always at
most 2, and they are in arbitary but consistent order.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:ev)

### Tesselation#getFacesOnVertex(vertex)

Returns the array of faces on the given face. If the tesselation
covers the entire plane, then this is guaranteed to return the faces in order
around the vertex (with arbitrary start and direction). Otherwise it can return
the faces in any order.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:vf)

### Tesselation#getEdgesOnVertex(vertex)

Returns the array of faces on the given face. If the tesselation
covers the entire plane, then this is guaranteed to return the edges in order
around the vertex (with arbitrary start and direction). Otherwise it can return
the edges in any order.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:ve)

### Tesselation#getOtherFace(face, edge)

If `face` is one of the two values returned by `getFacesOnEdge(edge)`, this
will return the other of the two faces. Otherwise this will return null.

``` js
tessSquare.getOtherFace([0, 0, "0"], [0, 0, 0, "0"]); // -> [0, -1, "0"]
tessSquare.getOtherFace([0, 1, "0"], [0, 0, 0, "0"]); // -> null
```

### Tesselation#getOtherVertex(vertex, edge)

If `vertex` is one of the two values returned by `getVerticesOnEdge(edge)`,
this will return the other of the two vertices. Otherwise this will return
null.

``` js
tessSquare.getOtherVertex([1, 1, "0"], [0, 1, 0, "0"]); // -> [0, 1, "0"]
tessSquare.getOtherVertex([1, 1, "0"], [0, 0, 0, "0"]); // -> null
```

### Tesselation#getAdjacentFaces(face)

Returns the array of faces which share at least one edge with the provided
face. The provided face is not included in the return.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:fadj)

### Tesselation#getAdjacentVertices(vertex)

Returns the array of vertices which share at least one edge with the provided
vertex. The provided vertex is not included in the return.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:vadj)

### Tesselation#getTouchingFaces(face)

Returns the array of faces which share at least one vertex with the provided
face. The provided face is not included in the return.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:ftouch)

### Tesselation#getTouchingEdges(edge)

Returns the array of edges which share at least one vertex with the provided
edge. The provided edge is not included in the return.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:etouch)

### Tesselation#getSurroundingEdges(edge)

Returns the array of edges which share at least one face with the provided
edge. The provided edge is not included in the return.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:esurr)

### Tesselation#getSurroundingVertices(vertex)

Returns the array of vertices which share at least one face with the provided
vertex. The provided vertex is not included in the return.

[Demo](https://mellowmelon.github.io/gridgy-presets/index.html#h:vsurr)

### Tesselation#getFaceCoordinates(face)

Returns the polygon representing the face in the plane. More exactly, returns
an array of points giving the vertex coordinates in order of the vertices on
the face.

``` js
tessSquare.getFaceCoordinates([1, 2, "0"]);
// -> [[1, 2], [2, 2], [2, 3], [1, 3]]
```

### Tesselation#getEdgeCoordinates(edge)

Returns the endpoints of the edge as a pair of points. The order is consistent
with `getVerticesOnEdge`, meaning it is in no particular order with respect to
the tesselation.

``` js
tessSquare.getEdgeCoordinates([1, 2, 3, "0"]); // -> [[1, 3], [2, 3]]
```

### Tesselation#getVertexCoordinates(vertex)

Returns the coordinates of the vertex in the plane. Suppose in the constructor,
the period matrix is `[a, b, c, d]` and the vertex ID `vid` has coordinates
`[vx, vy]`. Then providing the vertex `[px, py, v]` to this method will return
`[vx + px * a + py * c, vy + px * b + py * d]`.

``` js
tessSquare.getVertexCoordinates([1, 2, "0"]); // -> [1, 2]
```

### Tesselation#findFaceAt([x, y])

Returns the face containing the point at the given x and y coordinates, or null
if no such face is found.

``` js
tessSquare.findFaceAt([12.3, 456.78]); // -> [12, 456]
```

### Tesselation#findEdgeAt([x, y])

Returns the edge closest to the point at the given x and y coordinates, or null
if no such edge is found. Distance to the edge's midpoint is used to determine
what is closest.

This should never return null if there is at least one edge. If you do get
null, it is a bug.

``` js
tessSquare.findEdgeAt([12.3, 456.78]); // -> [12, 457, 0, "0"]
```

### Tesselation#findVertexAt([x, y])

Returns the vertex closest to the point at the given x and y coordinates, or
null if no such vertex is found. Distance to the vertex is used to determine
what is closest.

This should never return null if there is at least one vertex. If you do get
null, it is a bug.

``` js
tessSquare.findVertexAt([12.3, 456.78]); // -> [12, 457]
```

## Grid

This class is a small wrapper around a tesselation and a finite list of faces
to include as a part of the grid. It also provides a few wrapping features to
make Tesselations easier to work with.

Assuming the existence of tessSquare defined in the example for Tesselation,
here is how you would create a 3 by 3 square grid suitable for a tic-tac-toe
game.
``` js
import {Grid} from "gridgy";
const ticTacToeGrid = new Grid({
  tesselation: tessSquare,
  faceList: [
    [0, 0, "0"],
    [1, 0, "0"],
    [2, 0, "0"],
    [0, 1, "0"],
    [1, 1, "0"],
    [2, 1, "0"],
    [0, 2, "0"],
    [1, 2, "0"],
    [2, 2, "0"],
  ],
});
```

A reminder: Tesselations do a lot of caching of their more complex
computations. You should avoid creating superfluous Tesselations and have Grid
instances share Tesselation instances whenever possible.

The following methods on Tesselations are also exposed on Grid instances and
have the same behavior, excepting the wrappers specified by the Grid
constructor.
- getCanonicalEdge
- getEdgesOnFace
- getVerticesOnFace
- getFacesOnEdge
- getVerticesOnEdge
- getFacesOnVertex
- getEdgesOnVertex
- getAdjacentFaces
- getTouchingFaces
- getSurroundingEdges
- getTouchingEdges
- getSurroundingVertices
- getAdjacentVertices
- getOtherFace
- getOtherVertex
- getFaceCoordinates
- getEdgeCoordinates
- getVertexCoordinates
- findFaceAt
- findEdgeAt
- findVertexAt

### new Grid(params)

Takes a single object with the following keys, all optional except for
`tesselation` and `faceList`:
- `tesselation`: A `Tesselation` instance.
- `faceList`: An array of face keys from the tesselation that this Grid
  includes. If you specified `fromFaceTessKey` and `toFaceTessKey`, the keys in
  this array should use your custom format.
- `scale`: Default `1`. The scaling factor to apply to the tesselation
  coordinates. All Grid methods dealing with coordinates apply these
  transformations before forwarding to or returning from the Tesselation.
- `origin`: Default `[0, 0]`. The location of the Tesselation's origin in this
  Grid, post-scaling. All Grid methods dealing with coordinates apply these
  transformations before forwarding to or returning from the Tesselation.
- `fromFaceTessKey`: The keys for faces, edges, and vertices in a Grid instance
  can use whatever format you like. For example, you may find it much more
  convenient to work with strings than arrays so that `===` works, or you may
  want to use a different coordinate system. If you want to customize these
  keys, then `fromFaceTessKey` should be function taking a face key in the
  Tesselation's format and returning the corresponding key in your custom
  format.
- `toFaceTessKey`: If you are using custom face keys, this should be a function
  taking a face key in your custom format and returning the corresponding key
  in the Tesselation's format.
- `fromEdgeTessKey`: If you are using custom edge keys, this should be a
  function taking a edge key in the Tesselation's format and returning the
  corresponding key in your custom format.
- `toEdgeTessKey`: If you are using custom edge keys, this should be a function
  taking a edge key in your custom format and returning the corresponding key
  in the Tesselation's format.
- `fromVertexTessKey`: If you are using custom vertex keys, this should be a
  function taking a vertex key in the Tesselation's format and returning the
  corresponding key in your custom format.
- `toVertexTessKey`: If you are using custom vertex keys, this should be a
  function taking a vertex key in your custom format and returning the
  corresponding key in the Tesselation's format.
- `elToString`: Defaults to the global `String` constructor. This should be a
  function taking keys in your custom format and returning them as strings such
  that distinct keys become distinct strings. This is used so that the Grid
  instance can use `Set` data structures internally for querying the existence
  of elements. Unless your custom keys are plain objects or something else that
  does not convert to strings well, you can leave this alone.

After construction, these properties (or their defaults) are all exposed as an
appropriately named property on the Grid, although you are unlikely to need
them. You should not mutate these properties.

If you need to distort a tesselation in a way not supported by the `scale` and
`origin` properties, you will either need to do your own computations with
the coordinates provided to and returned by the Grid, or create a new
Tesselation to use.

### Grid#getProps()

Returns a shallow copy of the object passed to the constructor.

### Grid#getFaceList()

Returns an array of face keys in the grid. This is exactly what was provided
for `faceList` in the constructor.

``` js
ticTacToeGrid.getFaceList();
// -> [
//   [0, 0, "0"],
//   [1, 0, "0"],
//   [2, 0, "0"],
//   [0, 1, "0"],
//   [1, 1, "0"],
//   [2, 1, "0"],
//   [0, 2, "0"],
//   [1, 2, "0"],
//   [2, 2, "0"],
// ]
```

### Grid#getEdgeList()

Returns an array of edge keys in the grid. An edge is included here if at least
one of its faces is in the grid.

``` js
ticTacToeGrid.getEdgeList();
// -> [
//   [0, 0, 0, "0"],
//   [1, 0, 3, "0"],
//   [0, 1, 0, "0"],
//   [0, 0, 3, "0"],
//   [1, 0, 0, "0"],
//   [2, 0, 3, "0"],
//   ... etc.
// ] (24 total)
```

### Grid#getVertexList()

Returns an array of vertex keys in the grid. An vertex is included here if at
least one of its faces is in the grid.

``` js
ticTacToeGrid.getEdgeList();
// -> [
//   [0, 0, "0"],
//   [1, 0, "0"],
//   [1, 1, "0"],
//   [0, 1, "0"],
//   [2, 0, "0"],
//   [2, 1, "0"],
//   ... etc.
// ] (16 total)
```

### Grid#hasFace(face)

Returns true if the face is in the grid.

``` js
ticTacToeGrid.hasFace([0, 0, "0"]); // -> true
ticTacToeGrid.hasFace([3, 0, "0"]); // -> false
ticTacToeGrid.hasFace("wrongformat"); // -> false
```

### Grid#hasEdge(edge)

Returns true if the edge is in the grid.

``` js
ticTacToeGrid.hasEdge([0, 0, 0, "0"]); // -> true
ticTacToeGrid.hasEdge([3, 0, 3, "0"]); // -> true
ticTacToeGrid.hasEdge([0, 3, 3, "0"]); // -> false
ticTacToeGrid.hasEdge("wrongformat"); // -> false
```

### Grid#hasVertex(vertex)

Returns true if the vertex is in the grid.

``` js
ticTacToeGrid.hasVertex([0, 0, "0"]); // -> true
ticTacToeGrid.hasVertex([3, 0, "0"]); // -> true
ticTacToeGrid.hasVertex([0, 4, "0"]); // -> false
ticTacToeGrid.hasVertex("wrongformat"); // -> false
```

### Grid#isEdgeInside(edge)

Returns true if the edge is completely inside the grid, meaning both of its
faces are in the grid.

``` js
ticTacToeGrid.isEdgeInside([0, 0, 0, "0"]); // -> true
ticTacToeGrid.isEdgeInside([0, 0, 3, "0"]); // -> false
```

### Grid#isEdgeOnBorder(edge)

Returns true if the edge is on the grid boundary, meaning exactly one of its
faces are in the grid.

``` js
ticTacToeGrid.isEdgeOnBorder([0, 0, 0, "0"]); // -> false
ticTacToeGrid.isEdgeOnBorder([0, 0, 3, "0"]); // -> true
```

### Grid#isEdgeOutside(edge)

Returns true if the edge is completely outside the grid, meaning none of its
faces are in the grid. This ends up just being the negation of `hasEdge`.

### Grid#getBoundingBox()

Returns smallest the `[x, y, w, h]` rectangle containing all of the grid's
vertices.

``` js
ticTacToeGrid.getBoundingBox(); // -> [0, 0, 3, 3]
```

# License

MIT
