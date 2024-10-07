import { assertEquals } from "@std/assert";
import { hello } from "../main.ts";

Deno.test({
  name: "hello",
  fn() {
    // Arrange
    const input = "world";

    // Act
    const result = hello(input);

    // Assert
    assertEquals(result, input);
  },
});
