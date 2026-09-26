package org.springframework.samples.petclinic.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * Tests for the pet side of the pet/visit relationship.
 */
class PetTests {

    private static Visit visit(LocalDate date) {
        Visit visit = new Visit();
        visit.setDate(date);
        return visit;
    }

    @Test
    void shouldSetPetWhenVisitIsAdded() {
        Pet pet = new Pet();
        Visit visit = visit(LocalDate.of(2020, 1, 1));

        pet.addVisit(visit);

        assertThat(visit.getPet()).isSameAs(pet);
        assertThat(pet.getVisits()).containsExactly(visit);
    }

    @Test
    void shouldReturnVisitsMostRecentFirstInAnUnmodifiableList() {
        Pet pet = new Pet();
        Visit older = visit(LocalDate.of(2019, 5, 4));
        Visit newer = visit(LocalDate.of(2021, 8, 12));
        pet.addVisit(older);
        pet.addVisit(newer);

        List<Visit> visits = pet.getVisits();

        assertThat(visits).containsExactly(newer, older);
        assertThatExceptionOfType(UnsupportedOperationException.class)
            .isThrownBy(() -> visits.add(visit(LocalDate.now())));
    }

    @Test
    void shouldDefaultVisitDateToToday() {
        assertThat(new Visit().getDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void shouldKeepTypeAndBirthDate() {
        PetType type = new PetType();
        type.setName("cat");
        Pet pet = new Pet();
        pet.setType(type);
        pet.setBirthDate(LocalDate.of(2015, 2, 3));

        assertThat(pet.getType().getName()).isEqualTo("cat");
        assertThat(pet.getBirthDate()).isEqualTo(LocalDate.of(2015, 2, 3));
    }

}
