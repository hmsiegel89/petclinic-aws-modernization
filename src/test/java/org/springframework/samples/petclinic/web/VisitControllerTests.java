package org.springframework.samples.petclinic.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.mockito.ArgumentCaptor;
import org.springframework.samples.petclinic.model.Pet;
import org.springframework.samples.petclinic.model.Visit;
import org.springframework.samples.petclinic.service.ClinicService;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test class for {@link VisitController}
 *
 * @author Colin But
 */
@SpringJUnitWebConfig(locations = {"classpath:spring/mvc-core-config.xml", "classpath:spring/mvc-test-config.xml"})
class VisitControllerTests {

    private static final int TEST_PET_ID = 1;

    @Autowired
    private VisitController visitController;

    @Autowired
    private ClinicService clinicService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(visitController).build();

        given(this.clinicService.findPetById(TEST_PET_ID)).willReturn(new Pet());
    }

    @Test
    void testInitNewVisitForm() throws Exception {
        mockMvc.perform(get("/owners/*/pets/{petId}/visits/new", TEST_PET_ID))
            .andExpect(status().isOk())
            .andExpect(view().name("pets/createOrUpdateVisitForm"));
    }

    @Test
    void testProcessNewVisitFormSuccess() throws Exception {
        mockMvc.perform(post("/owners/*/pets/{petId}/visits/new", TEST_PET_ID)
            .param("name", "George")
            .param("description", "Visit Description")
        )
            .andExpect(status().is3xxRedirection())
            .andExpect(view().name("redirect:/owners/{ownerId}"));
    }

    @Test
    void testProcessNewVisitFormHasErrors() throws Exception {
        mockMvc.perform(post("/owners/*/pets/{petId}/visits/new", TEST_PET_ID)
            .param("name", "George")
        )
            .andExpect(model().attributeHasErrors("visit"))
            .andExpect(status().isOk())
            .andExpect(view().name("pets/createOrUpdateVisitForm"));
    }

    @Test
    void testShowVisits() throws Exception {
        mockMvc.perform(get("/owners/*/pets/{petId}/visits", TEST_PET_ID))
            .andExpect(status().isOk())
            .andExpect(model().attributeExists("visits"))
            .andExpect(view().name("visitList"));
    }

    @Test
    void testProcessNewVisitFormSavesVisitAttachedToThePet() throws Exception {
        Pet pet = new Pet();
        pet.setId(TEST_PET_ID);
        given(this.clinicService.findPetById(TEST_PET_ID)).willReturn(pet);

        mockMvc.perform(post("/owners/*/pets/{petId}/visits/new", TEST_PET_ID)
            .param("description", "rabies shot")
        ).andExpect(status().is3xxRedirection());

        ArgumentCaptor<Visit> saved = ArgumentCaptor.forClass(Visit.class);
        verify(this.clinicService).saveVisit(saved.capture());
        assertThat(saved.getValue().getDescription()).isEqualTo("rabies shot");
        assertThat(saved.getValue().getPet()).isSameAs(pet);
    }

    @Test
    void testShowVisitsExposesThePetVisits() throws Exception {
        Pet pet = new Pet();
        Visit visit = new Visit();
        visit.setDescription("checkup");
        pet.addVisit(visit);
        given(this.clinicService.findPetById(TEST_PET_ID)).willReturn(pet);

        mockMvc.perform(get("/owners/*/pets/{petId}/visits", TEST_PET_ID))
            .andExpect(status().isOk())
            .andExpect(model().attribute("visits", hasItem(visit)));
    }

}
