package ao.safelab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class EquipamentoDTO {

    @Data
    public static class Request {
        @NotBlank(message = "tagRfid é obrigatório")
        private String tagRfid;

        @NotBlank(message = "nome é obrigatório")
        private String nome;

        @NotBlank(message = "numeroSerie é obrigatório")
        private String numeroSerie;

        private String descricao;

        @NotBlank(message = "laboratorio é obrigatório")
        private String laboratorio;

    }

    @Data
    public static class Response {
        private Long id;
        private String tagRfid;
        private String nome;
        private String numeroSerie;
        private String descricao;
        private String laboratorio;
        private String estado;
        private String criadoEm;
    }
}
