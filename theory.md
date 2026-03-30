### Introduction

The Closest Pair of Points problem is a fundamental problem in computational geometry. The objective is to determine the pair of points in a given set such that the Euclidean distance between them is minimum. Given a set of n points in a two-dimensional plane, this problem has applications in pattern recognition, clustering, computer graphics, geographic information systems (GIS), wireless sensor networks, robotics navigation, image processing, and collision detection.

<br>

Let two points in the plane be represented as:
P₁ = (x₁, y₁)
P₂ = (x₂, y₂)

The Euclidean distance between these two points is defined as:

<div align="center"> <b>d(P₁, P₂) = √((x₂ − x₁)² + (y₂ − y₁)²)</b> </div>

Where:
x₁, y₁ → coordinates of the first point
x₂, y₂ → coordinates of the second point
d(P₁, P₂) → straight-line distance between the two points

The objective is to find the pair (Pᵢ, Pⱼ) such that:
<div align="center"> <b>d(Pᵢ, Pⱼ) is minimum for all i ≠ j</b> </div>


### Divide and Conquer Approach for Closest Pair of Points

The Divide and Conquer paradigm provides an efficient solution by reducing unnecessary comparisons using spatial partitioning and geometric constraints.

Instead of comparing every pair of points, the algorithm restricts comparisons only to nearby points, significantly improving efficiency.

### Key Idea
  -Divide the point set into two halves
  -Solve each half recursively
  -Combine results efficiently by checking only nearby points

The efficiency of the algorithm mainly depends on the combine (strip) step, where unnecessary comparisons are avoided.

### Algorithm Stages

1. **Divide**:
  a. Sort all points based on x-coordinate
  b. Draw a vertical line through the median x-coordinate
  c. Divide points into two halves: left (Pₗ) and right (Pᵣ)
This ensures balanced recursion and equal-sized subproblems.
2. **Conquer**:
  a. Recursively find the closest pair in both halves
  b. Base case: for n ≤ 3, compute distances using brute force

δ<sub>L</sub> = minimum distance in the left half
δ<sub>R</sub> = minimum distance in the right half

Then the current minimum distance is:
<div align="center"> <b>δ = min(δ<sub>L</sub>, δ<sub>R</sub>)</b> </div>

Where:
δ represents the smallest distance found so far in the recursive process.
3. **Combine (Strip Optimization)**:
   a. Construct a vertical strip such that:
   <div align="center"><b>|x − x<sub>mid</sub>| &lt; δ</b></div>

   b. This creates a strip of width 2δ around the dividing line  
   c. Sort strip points by y-coordinate  
   d. Compare each point with at most next 7 points (due to geometric packing constraints)  

Where:
x<sub>mid</sub> = x-coordinate of the median dividing line
δ = current minimum distance
This forms a vertical strip of total width 2δ.
This ensures that only points near the dividing boundary are checked for possible closer pairs.

### Algorithm of Divide and Conquer

1. Input **n** points with x and y coordinates.
2. Sort points based on x-coordinate.
3. Divide the set into two halves by the median x-coordinate.
4. Recursively find the closest pair in each half.
5. Compute δ = min(δ<sub>L</sub>, δ<sub>R</sub>).
6. Construct a strip of width 2δ around the dividing line.
7. Sort strip points by y-coordinate.
8. Compare each point with its nearest neighbors in the strip.
9. Update δ if a closer pair is found.
10. Return the global closest pair and minimum distance.
11. 11. (Optional) Record execution time and number of comparisons for analysis.
<br>


### Example

Consider the set of points:
P = {(2,3), (3,4), (5,1), (12,10), (12,30), (40,50)}

After sorting by x-coordinate, the points are divided into two halves.
The closest pair in the left half is (2,3) and (3,4) with distance √2.
The closest pair in the right half has distance 20.

The minimum of both halves is:
δ = √2

A vertical strip of width 2δ is constructed around the median x-coordinate.
No closer pair is found across the strip.

**Final Closest Pair:** (2,3), (3,4)  
**Minimum Distance:** √2 ≈ 1.414

###  Performance Scenarios

* **Best Case (Clusters)**: Points form tight clusters, and the closest pair is found early with minimal strip comparisons. 
Example: Points grouped around (10,10), (50,50), and (90,90).
* **Worst Case (Collinear)**: Points lie nearly in a straight line, increasing strip comparisons but still maintaining **O(n log n)** complexity. Example: Points such as (10,10), (20,20), (30,30), (40,40).
Time complexity follows the recurrence:

<div align="center"><b>T(n) = 2T(n/2) + O(n)</b></div>

which solves to:

<div align="center"><b>O(n log n)</b></div>
<br>

### Advantages and Disadvantages of Divide and Conquer Approach

#### Advantages

**1. Improved Time Complexity**
  Reduces complexity from O(n²) to O(n log n)

**2. Efficient for Large Datasets**
  Reduces unnecessary comparisons using spatial filtering

**3. Optimal Use of Geometry**
  Uses strip and ordering properties effectively

**4. Scalable Approach**
  Suitable for large-scale geometric computations

#### Disadvantages

**1. Complex Implementation compared to brute force**
**2. Requires additional memory (O(n))**
**3. Higher constant factors for small inputs**
**4. Difficult to debug without visualization**

### Experimental Observation

The experiment demonstrates the divide and conquer approach through visualization.
  -Recursive splitting and merging are displayed step-by-step
  -Number of comparisons is tracked
  -A graph is plotted between input size and comparisons

Observation:
The number of comparisons grows approximately proportional to n log n, confirming theoretical complexity.

As input size increases, divide and conquer scales efficiently compared to brute force.

### Reference Note (Brute Force Comparison)

For very small input sizes (n ≤ 10), a simple brute force method that computes distances between all possible pairs may perform adequately. However, as n increases, the number of distance computations grows quadratically, making brute force infeasible for large datasets. The Divide and Conquer approach overcomes this limitation by reducing unnecessary comparisons through spatial partitioning and strip optimization, achieving O(n log n) scalability.

### Comparison Table

| Feature | Brute Force Approach | Divide and Conquer Approach |
| :--- | :--- | :--- |
| **Basic Strategy** | Exhaustive search (checks every pair) | Spatial partitioning (splits the plane) |
| **Time Complexity** | O(n²) | O(n log n) |
| **Space Complexity** | O(1) | O(n) |
| **Scalability** | Poor (slows down quickly) | High (efficient for large sets) |
| **Results** | Adequate for n ≤ 10 | Practically scalable for large n |
| **Efficiency for Large n** | Poor | Excellent |

#### Practical Comparison Examples

**Example 1: Small Dataset**

Consider 5 points on a 2D plane.

- **Brute Force Approach:**  
  Number of comparisons = n(n − 1) / 2  
  = 5(5 − 1) / 2  
  = 10 comparisons  

- **Divide and Conquer Approach:**  
  Approximate comparisons = n log₂ n  
  = 5 × log₂ 5  
  ≈ 5 × 2.32  
  ≈ 12 comparisons  

- **Conclusion:**  
  For very small datasets, both approaches perform similarly. Due to its simplicity, brute force may be acceptable.

---

**Example 2: Large Dataset**

Consider **n = 10,000 points** randomly distributed on a 2D plane.

- **Brute Force Approach:**  
  Number of comparisons = n(n − 1) / 2  

  = 10,000 × 9,999 / 2  

  = 99,990,000 / 2  

  = **49,995,000 ≈ 50 million comparisons**

  This extremely large number of comparisons makes brute force computationally slow and impractical.

- **Divide and Conquer Approach:**  
  Number of comparisons ≈ n log₂ n  

  = 10,000 × log₂ 10,000  

  Since log₂ 10,000 ≈ 13.29  

  Total comparisons ≈ 10,000 × 13.29  

  = **132,900 ≈ 150,000 comparisons (approx.)**

- **Conclusion:**  
  Divide and Conquer reduces the number of comparisons from **~50 million to ~150,000**, which is more than **300 times fewer computations**, making it highly efficient and scalable for large datasets.

### Applications
Used in clustering, computer graphics, GIS, wireless sensor networks, robotics navigation, image processing, pattern recognition, astronomy, and air traffic control.


### Conclusion

The Closest Pair problem is efficiently solved using the Divide and Conquer approach. The algorithm reduces time complexity from **O(n²)** to **O(n log n)** and limiting comparisons using geometric constraints, the algorithm provides a scalable, efficient, and optimal solution for large datasets.

### Learning Outcomes

- Understand the Closest Pair problem  
- Apply Divide and Conquer strategy  
- Analyze efficiency using comparison count  
- Interpret scalability using graphs  