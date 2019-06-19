/// <reference types="Cypress" />

//import { Graph } from "../../src/js/graph";

describe("My First Test", function(){
    it("does not do much!", function(){
        expect(true).to.equal(true)

    })
})

describe('My First Test', function() {
  it('Visits the Kitchen Sink', function() {

    cy.get("svg").click(281,378);
    cy.get("#n2").click();
    cy.wait(1000);
    cy.get("#n1").click();
    cy.get("#n2-n1");

  })
})