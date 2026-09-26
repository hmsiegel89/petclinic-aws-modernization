package org.springframework.samples.petclinic.service;

import org.mockito.Mockito;

/**
 * Factory for the {@link ClinicService} mock used by the web layer tests.
 * <p>
 * Declaring the mock through this factory (instead of calling {@code Mockito.mock}
 * directly from XML) gives the container a resolvable return type.
 */
public final class ClinicServiceMocks {

    private ClinicServiceMocks() {
    }

    public static ClinicService clinicServiceMock() {
        return Mockito.mock(ClinicService.class);
    }

}
