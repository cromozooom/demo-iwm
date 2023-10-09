let families = [];
let mainFamilyName = "Nicu";
let nodes = [];
let links = [];
let familyLinks = [];
let familiesNodes = [];
let chargeStrength = -300;

fetch("dataFamilies.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("Data is not an array");
    }

    families = data;

    families.forEach((family) => {
      // Process nodes
      let familyNodes = family.members.map((member) => ({
        id: member.id,
        name: member.name + " (" + member.id + ")",
        icon: member.icon,
        group: family.name,
      }));
      nodes = nodes.concat(familyNodes);

      // Process links
      let familyLinks = family.members.flatMap((member) =>
        member.links.map((link) => ({
          source: member.id,
          target: link,
        }))
      );
      links = links.concat(familyLinks);
    });

    createVisualization(nodes, links);

    // Create checkboxes
    const checkboxesDiv = document.getElementById("checkboxes");
    families.forEach((family) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = family.name;
      checkbox.checked = true;

      const label = document.createElement("label");
      label.htmlFor = family.name;
      label.textContent = family.name;

      checkbox.addEventListener("change", function () {
        const isChecked = this.checked;
        const checkedFamilyName = this.id;

        if (isChecked) {
          const filteredFamily = families.find(
            (family) => family.name === checkedFamilyName
          );
          if (filteredFamily) {
            filteredFamily.members.forEach((member) => {
              const isNodeExists = familyNodes.some(
                (node) => node.id === member.id
              );

              if (!isNodeExists) {
                familyNodes.push({
                  id: member.id,
                  name: member.name,
                  icon: member.icon,
                  group: checkedFamilyName,
                });
              }

              member.links.forEach((linkId) => {
                const isLinkExists = familyLinks.some(
                  (link) =>
                    (link.source === member.id && link.target === linkId) ||
                    (link.source === linkId && link.target === member.id)
                );

                if (
                  !isLinkExists &&
                  familyNodes.some((node) => node.id === linkId)
                ) {
                  familyLinks.push({
                    source: member.id,
                    target: linkId,
                    value: 1,
                  });
                }
              });
            });
          }
        } else {
          const uncheckedFamilyNodes = familyNodes.filter(
            (node) => node.group === checkedFamilyName
          );
          familyNodes = familyNodes.filter(
            (node) => node.group !== checkedFamilyName
          );
          familyLinks = familyLinks.filter((link) => {
            return !(
              uncheckedFamilyNodes.some((node) => node.id === link.source) ||
              uncheckedFamilyNodes.some((node) => node.id === link.target)
            );
          });
        }

        updateVisualization("checkbox", familyNodes, familyLinks);
      });

      checkboxesDiv.appendChild(checkbox);
      checkboxesDiv.appendChild(label);
    });
  })
  .catch((error) => {
    console.error("There was a problem with the fetch operation:", error);
  });

function updateVisualization(location, nodes, links) {
  console.log(`Location: ${location}`);
  console.log("Nodes:", nodes);
  console.log("Links:", links);
}

function createVisualization(nodes, links) {
  console.log(nodes, links);

  var svg = d3.select("svg"),
    width = svg.node().getBoundingClientRect().width,
    height = svg.node().getBoundingClientRect().height;

  var color = d3.scaleOrdinal(d3.schemeCategory20);

  var simulation;
  var chargeStrength = -300;

  document
    .getElementById("chargeSlider")
    .addEventListener("input", function () {
      chargeStrength = +this.value;
      updateCharge(chargeStrength);
    });

  function updateCharge(chargeValue) {
    simulation.force("charge", d3.forceManyBody().strength(chargeValue));
    simulation.alpha(1).restart();
  }

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id(function (d) {
        return d.id;
      })
    )
    .force("charge", d3.forceManyBody().strength(chargeStrength))
    .force("center", d3.forceCenter(width / 2, height / 2));

  var link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("class", function (d) {
      return "link group" + d.source.group;
    })
    .attr("stroke-width", function (d) {
      return Math.sqrt(d.value);
    });

  var node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", function (d) {
      return "node group" + d.group;
    })
    .attr("r", 18)
    .attr("stroke", function (d) {
      return color(d.group);
    })
    .attr("fill", "#fff")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  var icon = svg
    .append("g")
    .attr("class", "icon")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", function (d) {
      return "node group" + d.group; // Assigning the group class
    })
    .attr("text-anchor", "middle")
    .attr("fill", function (d) {
      return color(d.group);
    })
    .attr("dominant-baseline", "central")
    .attr("font-family", "FontAwesome")
    .attr("font-size", "15px")
    .attr("class", function (d) {
      return "icon fas group" + d.group; // Assigning the group class
    })
    .text(function (d) {
      return d.icon;
    });

  var label = svg
    .append("g")
    .attr("class", "label")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", function (d) {
      return "node group" + d.group;
    })
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", "10px")
    .text(function (d) {
      return d.name;
    });

  node.append("title").text(function (d) {
    return d.id;
  });

  simulation.on("tick", ticked);

  function ticked() {
    link
      .attr("x1", function (d) {
        return d.source.x;
      })
      .attr("y1", function (d) {
        return d.source.y;
      })
      .attr("x2", function (d) {
        return d.target.x;
      })
      .attr("y2", function (d) {
        return d.target.y;
      });

    node
      .attr("cx", function (d) {
        return d.x;
      })
      .attr("cy", function (d) {
        return d.y;
      });
    icon
      .attr("x", function (d) {
        return d.x;
      })
      .attr("y", function (d) {
        return d.y;
      });
    label
      .attr("x", function (d) {
        return d.x;
      })
      .attr("y", function (d) {
        return d.y + 25;
      });
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}
