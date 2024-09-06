document.addEventListener("DOMContentLoaded", () => {
    let user = "bobby";

    document.body.textContent = greeter(user);
});

function greeter(person: string) {
    return "hello, " + person;
}