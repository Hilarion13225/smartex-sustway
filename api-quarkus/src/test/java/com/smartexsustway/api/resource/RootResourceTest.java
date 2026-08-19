package com.smartexsustway.api.resource;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
class RootResourceTest {

    @Test
    void racineDoitRepondre200() {
        given()
          .when().get("/api/v1")
          .then()
             .statusCode(200)
             .body("application", is("Smartex Sustway — API"));
    }
}
