package {{packageName}}

import org.springframework.boot.builder.SpringApplicationBuilder
{{#newServletInitializer}}
import org.springframework.boot.web.support.SpringBootServletInitializer
{{/newServletInitializer}}
{{^newServletInitializer}}
import org.springframework.boot.context.web.SpringBootServletInitializer
{{/newServletInitializer}}

class ServletInitializer : SpringBootServletInitializer() {

	override fun configure(application: SpringApplicationBuilder) : SpringApplicationBuilder {
		return application.sources({{applicationName}}::class.java)
	}

}
