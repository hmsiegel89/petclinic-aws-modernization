package org.springframework.samples.petclinic.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * Tests for the owner side of the owner/pet relationship.
 */
class OwnerTests {

    private static Pet pet(String name, Integer id) {
        Pet pet = new Pet();
        pet.setName(name);
        pet.setId(id);
        return pet;
    }

    @Test
    void shouldSetOwnerWhenPetIsAdded() {
        Owner owner = new Owner();
        Pet pet = pet("Basil", 1);

        owner.addPet(pet);

        assertThat(pet.getOwner()).isSameAs(owner);
        assertThat(owner.getPets()).containsExactly(pet);
    }

    @Test
    void shouldReturnPetsSortedByNameInAnUnmodifiableList() {
        Owner owner = new Owner();
        Pet zaza = pet("Zaza", 1);
        Pet basil = pet("Basil", 2);
        owner.addPet(zaza);
        owner.addPet(basil);

        List<Pet> pets = owner.getPets();

        assertThat(pets).containsExactly(basil, zaza);
        assertThatExceptionOfType(UnsupportedOperationException.class)
            .isThrownBy(() -> pets.add(pet("Iggy", 3)));
    }

    @Test
    void shouldFindPetByNameIgnoringCase() {
        Owner owner = new Owner();
        Pet basil = pet("Basil", 1);
        owner.addPet(basil);

        assertThat(owner.getPet("BASIL")).isSameAs(basil);
        assertThat(owner.getPet("basil")).isSameAs(basil);
        assertThat(owner.getPet("Leo")).isNull();
    }

    @Test
    void shouldSkipNewPetsWhenIgnoreNewIsRequested() {
        Owner owner = new Owner();
        Pet newPet = pet("Basil", null);
        owner.addPet(newPet);

        assertThat(owner.getPet("Basil", true)).isNull();
        assertThat(owner.getPet("Basil", false)).isSameAs(newPet);

        newPet.setId(1);
        assertThat(owner.getPet("Basil", true)).isSameAs(newPet);
    }

    @Test
    void shouldExposeItsStateInToString() {
        Owner owner = new Owner();
        owner.setId(1);
        owner.setFirstName("George");
        owner.setLastName("Franklin");
        owner.setAddress("110 W. Liberty St.");
        owner.setCity("Madison");
        owner.setTelephone("6085551023");

        assertThat(owner.toString())
            .contains("lastName = 'Franklin'")
            .contains("city = 'Madison'")
            .contains("telephone = '6085551023'");
    }

}
