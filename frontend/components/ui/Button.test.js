import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows a loading label", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Please wait…");
  });
});
