package org.springframework.samples.petclinic.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.samples.petclinic.model.Owner;
import org.springframework.samples.petclinic.model.Pet;
import org.springframework.samples.petclinic.model.PetType;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.Errors;

/**
 * Test class for {@link PetValidator}.
 */
class PetValidatorTests {

    private final PetValidator validator = new PetValidator();

    private static Pet validPet() {
        PetType type = new PetType();
        type.setName("cat");
        Pet pet = new Pet();
        pet.setName("Basil");
        pet.setType(type);
        pet.setBirthDate(LocalDate.of(2020, 1, 1));
        return pet;
    }

    private Errors validate(Pet pet) {
        Errors errors = new BeanPropertyBindingResult(pet, "pet");
        this.validator.validate(pet, errors);
        return errors;
    }

    @Test
    void shouldSupportPetsOnly() {
        assertThat(this.validator.supports(Pet.class)).isTrue();
        assertThat(this.validator.supports(Owner.class)).isFalse();
    }

    @Test
    void shouldAcceptAValidPet() {
        assertThat(validate(validPet()).hasErrors()).isFalse();
    }

    @Test
    void shouldRejectAPetWithoutName() {
        Pet pet = validPet();
        pet.setName("");

        assertThat(validate(pet).getFieldError("name")).isNotNull();
    }

    @Test
    void shouldRejectANewPetWithoutType() {
        Pet pet = validPet();
        pet.setType(null);

        assertThat(validate(pet).getFieldError("type")).isNotNull();
    }

    @Test
    void shouldAcceptAnExistingPetWithoutType() {
        Pet pet = validPet();
        pet.setId(1);
        pet.setType(null);

        assertThat(validate(pet).getFieldError("type")).isNull();
    }

    @Test
    void shouldRejectAPetWithoutBirthDate() {
        Pet pet = validPet();
        pet.setBirthDate(null);

        assertThat(validate(pet).getFieldError("birthDate")).isNotNull();
    }

}
